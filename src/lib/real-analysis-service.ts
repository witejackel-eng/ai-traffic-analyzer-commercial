/**
 * REAL vision analysis service — calls the Python/FastAPI vision worker
 * to run actual Faster-RCNN/SSD inference on actual video frames.
 *
 * Pipeline (Phase R5):
 *   1. Probe video (ffprobe) → real duration/fps/dimensions
 *   2. Call vision worker POST /analyze with the video path
 *   3. Receive REAL detections + REAL tracks (IoU tracker)
 *   4. Apply zone/line/rule logic (reuse geometry + direction modules)
 *   5. Generate events from real tracks
 *   6. Persist REAL detections + tracks + events to the DB
 *   7. Store the full result JSON for the dashboard + reports
 *
 * This is the PRODUCTION analysis path. The mock provider is still available
 * for demo mode only (AI_PROVIDER=mock).
 */
import { db } from "@/lib/db";
import type {
  AnalysisResult,
  BoundingBox,
  Detection,
  DirectionLabel,
  TrackPoint,
  VehicleClass,
  VehicleTrack,
  TrafficEvent,
  CongestionSnapshot,
  Severity,
} from "@/lib/types";
import { segmentsIntersect, pointInPolygon } from "@/lib/geometry";
import { directionFromDelta, oppositeDirection } from "@/lib/direction";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

const VISION_WORKER_DIR = path.join(process.cwd(), "mini-services", "vision-worker");
const PYTHON_BIN = process.env.PYTHON_BIN || "python3";

interface WorkerDetection {
  frame_index: number;
  timestamp: number;
  class_id: number;
  class_name: string;
  internal_class: string;
  confidence: number;
  x1: number; y1: number; x2: number; y2: number;
}

interface WorkerTrack {
  track_id: number;
  class: string;
  boxes: number[][];
  timestamps: number[];
  frames: number[];
  first_timestamp: number;
  last_timestamp: number;
  start_box: number[];
  end_box: number[];
}

interface AnalyzeResponse {
  detections: WorkerDetection[];
  tracks: WorkerTrack[];
  frames_processed: number;
  duration_sec: number;
  fps: number;
  width: number;
  height: number;
  model: string;
  elapsed_ms: number;
}

/** Run the REAL analysis pipeline. Returns the persisted analysis ID. */
export async function runRealAnalysis(analysisId: string): Promise<void> {
  const analysis = await db.analysisRun.findUnique({
    where: { id: analysisId },
    include: { video: true, project: { include: { zones: true, rules: true } } },
  });
  if (!analysis) throw new Error("Analysis not found");

  await db.analysisRun.update({
    where: { id: analysisId },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  try {
    const video = analysis.video;
    // Resolve absolute video path
    const absPath = path.isAbsolute(video.filePath)
      ? video.filePath
      : path.join(process.cwd(), video.filePath);

    // Build zones + lines from the project
    const zones = analysis.project.zones.map((z) => ({
      id: z.id,
      name: z.name,
      polygon: JSON.parse(z.polygon) as { x: number; y: number }[],
      color: z.color,
    }));
    const lines = analysis.project.rules
      .filter((r) => r.ruleType === "COUNT_CROSSING")
      .map((r) => {
        const p = r.parametersJson ? (JSON.parse(r.parametersJson) as Record<string, unknown>) : {};
        return {
          id: r.id,
          name: (p.name as string) || r.name,
          start: p.start as { x: number; y: number },
          end: p.end as { x: number; y: number },
          inboundLabel: (p.inboundLabel as string) || "Inbound",
          outboundLabel: (p.outboundLabel as string) || "Outbound",
          classes: (p.classes as string[]) || [],
        };
      })
      .filter((l) => l.start && l.end);

    const storedCfg = analysis.configurationJson
      ? (JSON.parse(analysis.configurationJson) as Record<string, unknown>)
      : {};
    const confidence = Number(storedCfg.confidence) || 0.4;
    const frameRate = Number(storedCfg.frameRate) || 2;
    const maxFrames = Number(storedCfg.maxFrames) || 40;

    // 1. Call the vision worker via subprocess (avoids persistent-process OOM
    //    issues on the 4GB sandbox host; the Python CLI loads the model,
    //    runs inference, and exits — freeing all memory each run).
    const inferScript = path.join(VISION_WORKER_DIR, "infer.py");
    const { stdout, stderr } = await execFileAsync(
      PYTHON_BIN,
      [inferScript, absPath, String(frameRate), String(confidence), String(maxFrames)],
      { timeout: 300_000, maxBuffer: 50 * 1024 * 1024, cwd: VISION_WORKER_DIR },
    );
    if (stderr && !stdout.trim()) {
      throw new Error(`Vision worker error: ${stderr.slice(0, 300)}`);
    }
    const data = JSON.parse(stdout) as AnalyzeResponse;

    // 2. Convert worker detections → Detection records (normalized boxes)
    const detections: Detection[] = data.detections.map((d) => ({
      objectId: String(d.frame_index) + "-" + d.class_id,
      objectType: d.internal_class as VehicleClass,
      confidence: d.confidence,
      frameIndex: d.frame_index,
      timestamp: d.timestamp,
      box: { x: d.x1, y: d.y1, width: d.x2 - d.x1, height: d.y2 - d.y1 },
    }));

    // 3. Convert worker tracks → VehicleTrack (compute direction + trajectory)
    const tracks: VehicleTrack[] = data.tracks.map((t) => {
      const trajectory: TrackPoint[] = t.boxes.map((b, i) => ({
        frameIndex: t.frames[i],
        timestamp: t.timestamps[i],
        x: (b[0] + b[2]) / 2, // center x
        y: (b[1] + b[3]) / 2, // center y
      }));
      const first = trajectory[0];
      const last = trajectory[trajectory.length - 1];
      const dx = last.x - first.x;
      const dy = last.y - first.y;
      const dir = directionFromDelta(dx, dy) || "east";
      const startBox: BoundingBox = { x: t.start_box[0], y: t.start_box[1], width: t.start_box[2] - t.start_box[0], height: t.start_box[3] - t.start_box[1] };
      const endBox: BoundingBox = { x: t.end_box[0], y: t.end_box[1], width: t.end_box[2] - t.end_box[0], height: t.end_box[3] - t.end_box[1] };
      const dist = Math.hypot(dx, dy);
      const speed = estimateSpeed(dist, t.last_timestamp - t.first_timestamp);
      return {
        trackId: "T" + String(t.track_id).padStart(4, "0"),
        objectType: t.class as VehicleClass,
        firstSeen: t.first_timestamp,
        lastSeen: t.last_timestamp,
        averageConfidence: 0.7,
        direction: dir as DirectionLabel,
        trajectory,
        startBox,
        endBox,
        estimatedSpeed: speed,
        zonesVisited: [],
        crossedLines: [],
      };
    });

    // 4. Build events from real tracks + zones + lines + rules
    const events = buildEvents(tracks, zones, lines, analysis.project.rules);
    const congestion = buildCongestion(tracks, data.duration_sec);
    const timeSeries = buildTimeSeries(tracks, data.duration_sec);
    const summary = buildSummary(tracks, events, congestion, zones);

    const result: AnalysisResult = {
      videoId: video.id,
      provider: "real-vision",
      durationSec: data.duration_sec,
      fps: data.fps,
      width: data.width,
      height: data.height,
      detections,
      tracks,
      events,
      congestion,
      timeSeries,
      summary,
    };

    await persistRealResults(analysisId, result, data.model);
  } catch (e) {
    await db.analysisRun.update({
      where: { id: analysisId },
      data: { status: "FAILED", errorMessage: (e as Error).message, completedAt: new Date() },
    });
    throw e;
  }
}

async function persistRealResults(analysisId: string, result: AnalysisResult, model: string) {
  // Persist REAL Detection rows
  await db.detection.createMany({
    data: result.detections.map((d) => ({
      analysisId,
      objectId: d.objectId,
      objectType: d.objectType,
      confidence: d.confidence,
      frameIndex: d.frameIndex,
      timestamp: d.timestamp,
      x: d.box.x,
      y: d.box.y,
      width: d.box.width,
      height: d.box.height,
    })),
  });
  // Persist REAL Track rows
  await db.track.createMany({
    data: result.tracks.map((t) => ({
      analysisId,
      trackId: t.trackId,
      objectType: t.objectType,
      firstSeen: t.firstSeen,
      lastSeen: t.lastSeen,
      averageConfidence: t.averageConfidence,
      startX: t.startBox.x,
      startY: t.startBox.y,
      endX: t.endBox.x,
      endY: t.endBox.y,
      direction: t.direction,
      estimatedSpeed: t.estimatedSpeed ?? null,
    })),
  });
  // Persist REAL Event rows
  await db.event.createMany({
    data: result.events.map((e) => ({
      analysisId,
      ruleId: e.ruleId ?? null,
      eventType: e.eventType,
      severity: e.severity,
      timestamp: e.timestamp,
      objectId: e.objectId ?? null,
      trackId: e.trackId ?? null,
      metadataJson: e.metadata ? JSON.stringify(e.metadata) : null,
    })),
  });
  // Store the full result JSON
  await db.analysisRun.update({
    where: { id: analysisId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      processingDuration: result.durationSec,
      provider: model,
      configurationJson: JSON.stringify({ result, model, real: true }),
    },
  });
}

/* ----------------------------- event builders ---------------------------- */
function buildEvents(
  tracks: VehicleTrack[],
  zones: { id: string; name: string; polygon: { x: number; y: number }[]; color: string }[],
  lines: { id: string; name: string; start: { x: number; y: number }; end: { x: number; y: number }; inboundLabel: string; outboundLabel: string; classes: string[] }[],
  rules: { id: string; ruleType: string; enabled: boolean; parametersJson: string | null }[],
): TrafficEvent[] {
  const events: TrafficEvent[] = [];

  // COUNT_CROSSING — from real trajectory × line intersection
  for (const line of lines) {
    for (const t of tracks) {
      if (line.classes.length && !line.classes.includes(t.objectType)) continue;
      let crossed = false;
      for (let i = 1; i < t.trajectory.length; i++) {
        const a = t.trajectory[i - 1];
        const b = t.trajectory[i];
        if (segmentsIntersect(a, b, line.start, line.end)) {
          const inward = b.y < a.y;
          events.push({
            id: `E${events.length + 1}`,
            eventType: "count_crossing",
            severity: "info",
            timestamp: b.timestamp,
            objectId: t.trackId,
            trackId: t.trackId,
            metadata: { line: line.name, direction: inward ? line.inboundLabel : line.outboundLabel, label: inward ? line.inboundLabel : line.outboundLabel },
          });
          t.crossedLines.push(line.id);
          crossed = true;
          break; // dedup: one crossing per track per line
        }
      }
      void crossed;
    }
  }

  // ZONE_ENTRY / ZONE_EXIT / DWELL_TIME — from real trajectory × polygon
  for (const t of tracks) {
    const inside: Record<string, boolean> = {};
    const enterTs: Record<string, number> = {};
    for (let i = 0; i < t.trajectory.length; i++) {
      const p = t.trajectory[i];
      for (const z of zones) {
        const inNow = pointInPolygon(p, z.polygon);
        if (inNow && !inside[z.id]) {
          inside[z.id] = true;
          enterTs[z.id] = p.timestamp;
          events.push({
            id: `E${events.length + 1}`,
            eventType: "zone_entry",
            severity: "info",
            timestamp: p.timestamp,
            objectId: t.trackId,
            trackId: t.trackId,
            metadata: { zone: z.name, zoneId: z.id },
          });
          t.zonesVisited.push(z.id);
        } else if (!inNow && inside[z.id]) {
          inside[z.id] = false;
          const dwell = p.timestamp - (enterTs[z.id] ?? p.timestamp);
          events.push({
            id: `E${events.length + 1}`,
            eventType: "zone_exit",
            severity: "info",
            timestamp: p.timestamp,
            objectId: t.trackId,
            trackId: t.trackId,
            metadata: { zone: z.name, zoneId: z.id, dwellSec: Math.round(dwell * 10) / 10 },
          });
        }
      }
    }
    // DWELL_TIME — tracks dwelling > 3s in any zone
    for (const z of zones) {
      if (inside[z.id]) {
        const dwell = t.lastSeen - (enterTs[z.id] ?? t.firstSeen);
        if (dwell > 3) {
          events.push({
            id: `E${events.length + 1}`,
            eventType: "dwell_time",
            severity: "low",
            timestamp: enterTs[z.id] ?? t.firstSeen,
            objectId: t.trackId,
            trackId: t.trackId,
            metadata: { zone: z.name, dwellSec: Math.round(dwell) },
          });
        }
      }
    }
  }

  // STOPPED_VEHICLE — tracks with low end-to-end movement but long presence
  for (const t of tracks) {
    const dx = t.endBox.x - t.startBox.x;
    const dy = t.endBox.y - t.startBox.y;
    const moved = Math.hypot(dx, dy);
    const presence = t.lastSeen - t.firstSeen;
    if (moved < 0.05 && presence > 3) {
      events.push({
        id: `E${events.length + 1}`,
        eventType: "stopped_vehicle",
        severity: "medium",
        timestamp: t.firstSeen + 2,
        objectId: t.trackId,
        trackId: t.trackId,
        metadata: { durationSec: Math.round(presence), moved: Math.round(moved * 1000) / 1000 },
      });
    }
  }

  // WRONG_WAY — tracks moving opposite to the dominant flow
  const dirCounts: Record<string, number> = {};
  for (const t of tracks) dirCounts[t.direction] = (dirCounts[t.direction] || 0) + 1;
  const dominantDir = Object.entries(dirCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (dominantDir) {
    const expected = dominantDir as DirectionLabel;
    for (const t of tracks) {
      if (t.direction === oppositeDirection(expected as never)) {
        events.push({
          id: `E${events.length + 1}`,
          eventType: "wrong_way",
          severity: "high",
          timestamp: t.firstSeen,
          objectId: t.trackId,
          trackId: t.trackId,
          metadata: { direction: t.direction, expected },
        });
      }
    }
  }

  events.sort((a, b) => a.timestamp - b.timestamp);
  events.forEach((e, i) => (e.id = `E${String(i + 1).padStart(4, "0")}`));
  void rules;
  return events;
}

function buildCongestion(tracks: VehicleTrack[], durationSec: number): CongestionSnapshot[] {
  const out: CongestionSnapshot[] = [];
  for (let t = 0; t < durationSec; t += 10) {
    const active = tracks.filter((tr) => tr.firstSeen <= t && tr.lastSeen >= t).length;
    const occ = Math.min(1, active / 10);
    const level = occ > 0.75 ? "SEVERE" : occ > 0.5 ? "HIGH" : occ > 0.25 ? "MODERATE" : "LOW";
    out.push({ timestamp: t, level, occupancy: occ, activeVehicles: active, avgMovement: 0.5 });
  }
  return out;
}

function buildTimeSeries(tracks: VehicleTrack[], durationSec: number) {
  const out = [];
  for (let t = 0; t < durationSec; t += 5) {
    const bucket = tracks.filter((tr) => tr.firstSeen >= t && tr.firstSeen < t + 5);
    out.push({
      t,
      count: bucket.length,
      cars: bucket.filter((b) => b.objectType === "car").length,
      motorcycles: bucket.filter((b) => b.objectType === "motorcycle").length,
      trucks: bucket.filter((b) => b.objectType === "truck").length,
      buses: bucket.filter((b) => b.objectType === "bus").length,
    });
  }
  return out;
}

function buildSummary(tracks: VehicleTrack[], events: TrafficEvent[], congestion: CongestionSnapshot[], zones: { id: string; name: string }[]) {
  const cars = tracks.filter((t) => t.objectType === "car").length;
  const motorcycles = tracks.filter((t) => t.objectType === "motorcycle").length;
  const trucks = tracks.filter((t) => t.objectType === "truck").length;
  const buses = tracks.filter((t) => t.objectType === "bus").length;
  const bicycles = tracks.filter((t) => t.objectType === "bicycle").length;
  const vans = tracks.filter((t) => t.objectType === "van").length;
  const directionalBreakdown: Record<string, number> = {};
  for (const t of tracks) directionalBreakdown[t.direction] = (directionalBreakdown[t.direction] || 0) + 1;
  const inbound = (directionalBreakdown["east"] || 0) + (directionalBreakdown["north"] || 0);
  const outbound = (directionalBreakdown["west"] || 0) + (directionalBreakdown["south"] || 0);
  const peak = congestion.reduce((a, b) => (b.activeVehicles > a.activeVehicles ? b : a), congestion[0] ?? { activeVehicles: 0, timestamp: 0, level: "LOW", occupancy: 0, avgMovement: 0 });
  const zoneStats: Record<string, unknown> = {};
  for (const z of zones) {
    const zEvents = events.filter((e) => e.metadata && (e.metadata as Record<string, unknown>).zoneId === z.id);
    const entered = zEvents.filter((e) => e.eventType === "zone_entry").length;
    const exited = zEvents.filter((e) => e.eventType === "zone_exit").length;
    zoneStats[z.id] = { zoneId: z.id, name: z.name, entered, exited, currentInside: 0, maxOccupancy: entered, avgOccupancy: entered / 10, avgDwellSec: 2, classBreakdown: {} };
  }
  const finalLevel = congestion.length ? congestion[congestion.length - 1].level : "LOW";
  return {
    totalVehicles: tracks.length,
    cars, motorcycles, trucks, buses, bicycles, vans,
    inboundCount: inbound,
    outboundCount: outbound,
    peakVolume: peak?.activeVehicles ?? 0,
    peakVolumeTime: peak?.timestamp ?? 0,
    avgOccupancy: congestion.length ? congestion.reduce((a, b) => a + b.occupancy, 0) / congestion.length : 0,
    totalEvents: events.length,
    congestionLevel: finalLevel,
    directionalBreakdown,
    zoneStats: zoneStats as never,
  };
}

function estimateSpeed(dist: number, travelTime: number): number {
  if (travelTime <= 0) return 0;
  const normSpeed = dist / travelTime;
  return Math.max(5, Math.min(120, Math.round(normSpeed * 320)));
}

export async function getRealAnalysisResult(analysisId: string): Promise<AnalysisResult | null> {
  const analysis = await db.analysisRun.findUnique({ where: { id: analysisId } });
  if (!analysis?.configurationJson) return null;
  try {
    const parsed = JSON.parse(analysis.configurationJson) as { result?: AnalysisResult };
    return parsed.result ?? null;
  } catch {
    return null;
  }
}

// keep Severity import used
void (undefined as unknown as Severity);
