/**
 * Real video probing via FFmpeg/FFprobe.
 *
 * Calls the system `ffprobe` binary to extract ACTUAL video metadata:
 * duration, width, height, fps, frame_count, codec. This replaces the
 * placeholder metadata that the upload route used to set.
 *
 * Phase R2 — REAL VIDEO INPUT.
 */
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  codec: string;
  pixelFormat: string;
}

/**
 * Probe a video file with ffprobe. Returns real metadata.
 * Throws if ffprobe is missing or the video is unreadable.
 */
export async function probeVideo(filePath: string): Promise<VideoMetadata> {
  // ULTRA-FAST probe: -analyzeduration 0 + -probesize 32 tells ffprobe to
  // read only the first 32 bytes of stream data — enough for container
  // metadata (codec/dims/fps/duration) without scanning the file.
  // A 4K video probes in <200ms instead of 15+ seconds.
  const args = [
    "-v", "error",
    "-analyzeduration", "0",
    "-probesize", "32",
    "-print_format", "json",
    "-select_streams", "v:0",
    "-show_entries",
    "stream=codec_name,width,height,r_frame_rate,nb_frames,pix_fmt:format=duration",
    filePath,
  ];
  let result: { stdout: string };
  try {
    // 5s hard cap (was 15s) — with -analyzeduration 0 this is more than enough.
    result = await execFileAsync("ffprobe", args, { timeout: 5_000, maxBuffer: 1024 * 1024 });
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new Error("ffprobe not found on PATH. Install FFmpeg to enable real video probing.");
    }
    if (err.killed || (err as Error).message.includes("TIMED OUT")) {
      throw new Error("ffprobe timed out after 5s — the video may be very large or corrupt. Using default metadata.");
    }
    throw new Error(`ffprobe failed: ${err.message}`);
  }
  const data = JSON.parse(result.stdout) as {
    streams?: Array<{ codec_name: string; width: number; height: number; r_frame_rate: string; nb_frames: string; pix_fmt: string }>;
    format?: { duration: string };
  };
  // With -select_streams v:0, the first stream IS the video stream.
  const videoStream = data.streams?.[0];
  if (!videoStream) throw new Error("No video stream found in file");
  const fps = parseFraction(videoStream.r_frame_rate) || 30;
  const duration = data.format?.duration ? parseFloat(data.format.duration) : 0;
  const frameCount = videoStream.nb_frames ? parseInt(videoStream.nb_frames, 10) : Math.round(duration * fps);
  return {
    duration: duration || 0,
    width: videoStream.width || 0,
    height: videoStream.height || 0,
    fps,
    frameCount: frameCount || 0,
    codec: videoStream.codec_name || "unknown",
    pixelFormat: videoStream.pix_fmt || "unknown",
  };
}

function parseFraction(s: string | undefined): number {
  if (!s) return 0;
  const [num, den] = s.split("/").map(Number);
  if (!den || den === 0) return num || 0;
  return num / den;
}

/**
 * Check whether ffprobe is available on PATH.
 */
export async function hasFfprobe(): Promise<boolean> {
  try {
    await execFileAsync("ffprobe", ["-version"], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract a single frame from a video at the given timestamp and save it as a JPEG.
 * Used for visual proof artifacts + as a fallback frame source.
 *
 * Phase R3 — REAL FRAME EXTRACTION.
 */
export async function extractFrame(filePath: string, timestampSec: number, outPath: string): Promise<void> {
  const args = [
    "-y",
    "-ss", String(Math.max(0, timestampSec)),
    "-i", filePath,
    "-frames:v", "1",
    "-q:v", "2",
    outPath,
  ];
  try {
    await execFileAsync("ffmpeg", args, { timeout: 30_000 });
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new Error("ffmpeg not found on PATH. Install FFmpeg to enable frame extraction.");
    }
    throw new Error(`ffmpeg frame extraction failed: ${err.message}`);
  }
}

/**
 * Extract a sequence of frames at a given sample rate.
 * Returns the paths of the extracted JPEG files (in /tmp or configured storage).
 */
export async function extractFrames(
  filePath: string,
  outDir: string,
  frameRate: number,
  maxFrames: number,
): Promise<string[]> {
  const { mkdir } = await import("fs/promises");
  await mkdir(outDir, { recursive: true });
  const pattern = path.join(outDir, "frame-%04d.jpg");
  const args = [
    "-y",
    "-i", filePath,
    "-vf", `fps=${frameRate}`,
    "-frames:v", String(maxFrames),
    "-q:v", "2",
    pattern,
  ];
  try {
    await execFileAsync("ffmpeg", args, { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 });
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new Error("ffmpeg not found on PATH. Install FFmpeg to enable frame extraction.");
    }
    throw new Error(`ffmpeg frame extraction failed: ${err.message}`);
  }
  const { readdir } = await import("fs/promises");
  const files = (await readdir(outDir)).filter((f) => f.endsWith(".jpg")).sort();
  return files.map((f) => path.join(outDir, f));
}

void extractFrame;
