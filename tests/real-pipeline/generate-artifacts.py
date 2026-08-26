"""
Generate visual proof artifacts for the REAL AI PIPELINE.

Reads a real analysis result (from /tmp/real-pipeline-result.json), re-extracts
frames from the source video at the detection timestamps, and draws the REAL
bounding boxes + track IDs + zones + counting line on top, producing PNG
artifacts in tests/real-pipeline/artifacts/.

Outputs:
  - original-frame.jpg          — raw video frame
  - annotated-detection.jpg    — frame with real detection boxes
  - annotated-tracked.jpg      — frame with track IDs + trajectories
  - zone-overlay.jpg           — frame with zone polygon drawn
  - line-crossing.jpg          — frame with counting line drawn
  - event-snapshot.jpg         — frame at an event timestamp
  - report.html                — the generated HTML report
"""
import json, os, sys, base64
import cv2
import numpy as np
import httpx

RESULT_PATH = "/tmp/real-pipeline-result.json"
VIDEO_PATH = "data/samples/real-traffic.mp4"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "tests", "real-pipeline", "artifacts")
BASE = "http://localhost:3000"

os.makedirs(OUT_DIR, exist_ok=True)

with open(RESULT_PATH) as f:
    data = json.load(f)

result = data["result"]
analysis_id = data["analysisId"]
detections = result["detections"]
tracks = result["tracks"]
events = result["events"]

# COCO class colors
COLORS = {
    "car": (50, 50, 200),
    "truck": (100, 100, 100),
    "bus": (200, 100, 50),
    "motorcycle": (200, 200, 50),
    "bicycle": (50, 200, 50),
    "van": (50, 150, 200),
}

cap = cv2.VideoCapture(VIDEO_PATH)
W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
print(f"video: {W}x{H}, {len(detections)} detections, {len(tracks)} tracks, {len(events)} events")

# Pick a frame at ~5s that has detections
target_t = 5.0
target_dets = [d for d in detections if abs(d["timestamp"] - target_t) < 0.5]
if not target_dets:
    target_t = detections[0]["timestamp"] if detections else 0
    target_dets = [d for d in detections if abs(d["timestamp"] - target_t) < 0.5]
# Seek to that frame
cap.set(cv2.CAP_PROP_POS_MSEC, target_t * 1000)
ret, frame = cap.read()
if not ret:
    print("ERROR: could not read frame at", target_t)
    sys.exit(1)

# 1. Original frame
cv2.imwrite(os.path.join(OUT_DIR, "original-frame.jpg"), frame)
print("✓ original-frame.jpg")

# 2. Annotated detection frame (draw REAL bounding boxes + confidence)
det_frame = frame.copy()
for d in target_dets:
    c = COLORS.get(d["objectType"], (200, 200, 200))
    x1 = int(d["box"]["x"] * W)
    y1 = int(d["box"]["y"] * H)
    x2 = int((d["box"]["x"] + d["box"]["width"]) * W)
    y2 = int((d["box"]["y"] + d["box"]["height"]) * H)
    cv2.rectangle(det_frame, (x1, y1), (x2, y2), c, 2)
    cv2.rectangle(det_frame, (x1, y1 - 18), (x1 + 110, y1), c, -1)
    cv2.putText(det_frame, f'{d["objectType"]} {d["confidence"]:.2f}', (x1 + 3, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
cv2.imwrite(os.path.join(OUT_DIR, "annotated-detection.jpg"), det_frame)
print(f"✓ annotated-detection.jpg ({len(target_dets)} boxes)")

# 3. Tracked frame — draw track IDs on the latest detection per active track
track_frame = frame.copy()
for t in tracks:
    if t["firstSeen"] <= target_t <= t["lastSeen"]:
        # find the closest trajectory point
        traj = t["trajectory"]
        closest = min(traj, key=lambda p: abs(p["timestamp"] - target_t))
        cx = int(closest["x"] * W)
        cy = int(closest["y"] * H)
        c = COLORS.get(t["objectType"], (200, 200, 200))
        # Draw trajectory trail
        for i in range(1, len(traj)):
            if traj[i]["timestamp"] > target_t: break
            p1 = (int(traj[i-1]["x"] * W), int(traj[i-1]["y"] * H))
            p2 = (int(traj[i]["x"] * W), int(traj[i]["y"] * H))
            cv2.line(track_frame, p1, p2, c, 2)
        cv2.circle(track_frame, (cx, cy), 8, c, -1)
        cv2.putText(track_frame, t["trackId"], (cx + 10, cy - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, c, 2)
cv2.imwrite(os.path.join(OUT_DIR, "annotated-tracked.jpg"), track_frame)
print(f"✓ annotated-tracked.jpg ({len(tracks)} tracks)")

# 4. Zone overlay — draw the configured zone polygon
zone_frame = frame.copy()
# Fetch the project's zones
zones_resp = httpx.get(f"{BASE}/api/projects/{data['projectId']}", timeout=30)
zones = zones_resp.json()["project"]["zones"]
for z in zones:
    poly = json.loads(z["polygon"])
    pts = np.array([[int(p["x"] * W), int(p["y"] * H)] for p in poly], dtype=np.int32)
    overlay = zone_frame.copy()
    cv2.fillPoly(overlay, [pts], tuple(int(c) for c in z["color"].lstrip("#")[i:i+2] for i in (0, 2, 4)) if False else (16, 185, 129))
    zone_frame = cv2.addWeighted(overlay, 0.3, zone_frame, 0.7, 0)
    cv2.polylines(zone_frame, [pts], True, (16, 185, 129), 2)
    cv2.putText(zone_frame, z["name"], (pts[0][0] + 5, pts[0][1] + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
cv2.imwrite(os.path.join(OUT_DIR, "zone-overlay.jpg"), zone_frame)
print(f"✓ zone-overlay.jpg ({len(zones)} zones)")

# 5. Line crossing — draw the counting line
line_frame = frame.copy()
rules_resp = httpx.get(f"{BASE}/api/projects/{data['projectId']}", timeout=30)
rules = [r for r in rules_resp.json()["project"]["rules"] if r["ruleType"] == "COUNT_CROSSING"]
for r in rules:
    p = json.loads(r["parametersJson"])
    s = p["start"]; e = p["end"]
    cv2.line(line_frame, (int(s["x"] * W), int(s["y"] * H)), (int(e["x"] * W), int(e["y"] * H)), (255, 200, 0), 3)
    cv2.putText(line_frame, p["name"], (int(s["x"] * W) + 5, int(s["y"] * H) - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 200, 0), 2)
cv2.imwrite(os.path.join(OUT_DIR, "line-crossing.jpg"), line_frame)
print(f"✓ line-crossing.jpg ({len(rules)} lines)")

# 6. Event snapshot — seek to the first event timestamp
if events:
    ev = events[0]
    cap.set(cv2.CAP_PROP_POS_MSEC, ev["timestamp"] * 1000)
    ret, ev_frame = cap.read()
    if ret:
        # Find the related detection
        ev_dets = [d for d in detections if abs(d["timestamp"] - ev["timestamp"]) < 0.5]
        for d in ev_dets:
            c = COLORS.get(d["objectType"], (200, 200, 200))
            x1 = int(d["box"]["x"] * W); y1 = int(d["box"]["y"] * H)
            x2 = int((d["box"]["x"] + d["box"]["width"]) * W); y2 = int((d["box"]["y"] + d["box"]["height"]) * H)
            cv2.rectangle(ev_frame, (x1, y1), (x2, y2), c, 2)
            cv2.rectangle(ev_frame, (x1, y1 - 18), (x1 + 130, y1), c, -1)
            cv2.putText(ev_frame, f'{ev["eventType"]} {ev["severity"]}', (x1 + 3, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.imwrite(os.path.join(OUT_DIR, "event-snapshot.jpg"), ev_frame)
        print(f"✓ event-snapshot.jpg ({ev['eventType']} @ {ev['timestamp']:.2f}s)")

cap.release()

# 7. Save the HTML report
report_resp = httpx.get(f"{BASE}/api/exports/report?analysisId={analysis_id}", timeout=30)
with open(os.path.join(OUT_DIR, "report.html"), "w") as f:
    f.write(report_resp.text)
print(f"✓ report.html ({len(report_resp.text)} bytes)")

print()
print("=== ALL VISUAL ARTIFACTS GENERATED ===")
for f in sorted(os.listdir(OUT_DIR)):
    p = os.path.join(OUT_DIR, f)
    print(f"  {f}: {os.path.getsize(p)//1024}KB")
