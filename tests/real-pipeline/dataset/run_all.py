#!/usr/bin/env python3
"""
Run the real pipeline (infer.py CLI) on all 5 validation videos, capturing:
- real metadata (ffprobe)
- real detections + tracks + events
- processing time
- peak memory
- output sizes

Outputs: tests/real-pipeline/dataset/results.json
"""
import json, os, sys, time, subprocess, resource, glob

PYTHON = os.environ.get("PYTHON_BIN", "python3")
INFER = "mini-services/vision-worker/infer.py"
VIDEO_DIR = "tests/real-pipeline/dataset/videos"
OUT = "tests/real-pipeline/dataset/results.json"

def ffprobe_meta(path):
    r = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", "-show_format", path],
                       capture_output=True, text=True, timeout=20)
    d = json.loads(r.stdout)
    s = d["streams"][0]
    fps_parts = s["r_frame_rate"].split("/")
    fps = float(fps_parts[0]) / float(fps_parts[1]) if float(fps_parts[1]) else 30
    return {
        "width": s["width"], "height": s["height"],
        "fps": round(fps, 2),
        "frame_count": int(s.get("nb_frames", 0)) or int(float(d["format"]["duration"]) * fps),
        "duration": float(d["format"]["duration"]),
        "codec": s["codec_name"],
    }

def peak_rss_kb():
    return resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss

videos = sorted(glob.glob(os.path.join(VIDEO_DIR, "*.mp4")))
results = []
for vpath in videos:
    name = os.path.basename(vpath)
    print(f"\n=== {name} ===", flush=True)
    meta = ffprobe_meta(vpath)
    print(f"  meta: {meta['width']}x{meta['height']} @ {meta['fps']}fps {meta['duration']}s ({meta['frame_count']} frames)")
    # max_frames: sample at 2fps for up to 40 frames
    max_frames = min(40, int(meta["duration"] * 2))
    t0 = time.time()
    rss_before = peak_rss_kb()
    r = subprocess.run([PYTHON, INFER, os.path.abspath(vpath), "2", "0.4", str(max_frames)],
                       capture_output=True, text=True, timeout=300, cwd=os.getcwd())
    elapsed = time.time() - t0
    rss_after = peak_rss_kb()
    if r.returncode != 0:
        print(f"  FAIL: {r.stderr[:200]}")
        results.append({"file": name, "meta": meta, "error": r.stderr[:300], "elapsed": elapsed})
        continue
    data = json.loads(r.stdout)
    # class breakdown
    classes = {}
    for d in data["detections"]:
        classes[d["internal_class"]] = classes.get(d["internal_class"], 0) + 1
    print(f"  dets={len(data['detections'])} tracks={len(data['tracks'])} classes={classes}")
    print(f"  inference: {elapsed:.1f}s, peak child RSS: {(rss_after-rss_before)}KB")
    results.append({
        "file": name,
        "meta": meta,
        "detections": len(data["detections"]),
        "tracks": len(data["tracks"]),
        "class_breakdown": classes,
        "frames_processed": data["frames_processed"],
        "elapsed_sec": round(elapsed, 2),
        "inference_elapsed_ms": round(data["elapsed_ms"], 0),
        "peak_rss_kb": rss_after - rss_before,
        "raw": data,
    })

with open(OUT, "w") as f:
    json.dump(results, f, indent=2, default=str)
print(f"\n=== DONE — {len(results)} videos processed, results → {OUT} ===")
# summary
total_dets = sum(r.get("detections", 0) for r in results)
total_tracks = sum(r.get("tracks", 0) for r in results)
print(f"Total: {total_dets} detections, {total_tracks} tracks across {len(results)} videos")
