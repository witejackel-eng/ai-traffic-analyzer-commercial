#!/usr/bin/env python3
"""
CLI inference tool — runs the REAL SSD MobileNet v1 detector on a video file
and prints JSON results to stdout. Designed to be called as a subprocess by
the Next.js API route so we don't need a persistent HTTP worker (which OOMs
on the 4GB sandbox).

Usage:
  python3 infer.py <video_path> <frame_rate> <confidence> <max_frames>

Output: JSON on stdout with {detections, tracks, metadata}.
Exit code: 0 on success, non-zero on error.
"""
import sys, os, json, time, gc
import cv2
import numpy as np
import onnxruntime as ort

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "ssd_mobilenet_v1_coco.onnx")
INPUT_SIZE = 300
COCO_TO_INTERNAL = {3: "car", 4: "motorcycle", 6: "bus", 8: "truck", 2: "bicycle"}

class Track:
    __slots__ = ("id","cls","boxes","timestamps","frames","last_box","missed","last_seen")
    def __init__(self, tid, cls, box, ts, fr):
        self.id = tid; self.cls = cls
        self.boxes = [list(box)]; self.timestamps = [ts]; self.frames = [fr]
        self.last_box = list(box); self.missed = 0; self.last_seen = ts

class IoUTracker:
    def __init__(self, iou_threshold=0.25, max_missed=2):
        self.iou_threshold = iou_threshold; self.max_missed = max_missed
        self.tracks = []; self._next_id = 1
    @staticmethod
    def _iou(a, b):
        ix1=max(a[0],b[0]); iy1=max(a[1],b[1]); ix2=min(a[2],b[2]); iy2=min(a[3],b[3])
        iw=max(0.0,ix2-ix1); ih=max(0.0,iy2-iy1); inter=iw*ih
        ua=max(0.0,a[2]-a[0])*max(0.0,a[3]-a[1]) + max(0.0,b[2]-b[0])*max(0.0,b[3]-b[1]) - inter
        return inter/ua if ua>0 else 0.0
    def update(self, dets, ts, fr):
        if not self.tracks:
            for d in dets:
                self.tracks.append(Track(self._next_id, d["internal_class"], d["box"], ts, fr)); self._next_id += 1
            return
        unmatched = list(range(len(dets))); d2t = {}
        for ti, t in enumerate(self.tracks):
            best = self.iou_threshold; best_di = -1
            for di in unmatched:
                d = dets[di]
                if d["internal_class"] != t.cls: continue
                iou = self._iou(t.last_box, d["box"])
                if iou > best: best = iou; best_di = di
            if best_di >= 0:
                d2t[best_di] = ti; unmatched.remove(best_di)
                d = dets[best_di]
                t.boxes.append(list(d["box"])); t.timestamps.append(ts); t.frames.append(fr)
                t.last_box = list(d["box"]); t.missed = 0; t.last_seen = ts
        for di in unmatched:
            d = dets[di]
            self.tracks.append(Track(self._next_id, d["internal_class"], d["box"], ts, fr)); self._next_id += 1
        matched = set(d2t.values())
        for ti, t in enumerate(self.tracks):
            if ti not in matched: t.missed += 1
        self.tracks = [t for t in self.tracks if t.missed <= self.max_missed]
    def active(self):
        return [{"track_id": t.id, "class": t.cls, "boxes": t.boxes, "timestamps": t.timestamps,
                 "frames": t.frames, "first_timestamp": t.timestamps[0], "last_timestamp": t.timestamps[-1],
                 "start_box": t.boxes[0], "end_box": t.boxes[-1]}
                for t in self.tracks if len(t.boxes) >= 2]

def main():
    if len(sys.argv) < 5:
        print(json.dumps({"error": "usage: infer.py <video> <fps> <conf> <max_frames>"}), file=sys.stderr)
        sys.exit(2)
    video_path = sys.argv[1]
    frame_rate = float(sys.argv[2])
    confidence = float(sys.argv[3])
    max_frames = int(sys.argv[4])
    if not os.path.isfile(video_path):
        print(json.dumps({"error": f"not found: {video_path}"}), file=sys.stderr); sys.exit(1)

    # Load ONNX model
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 2; opts.inter_op_num_threads = 1
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    sess = ort.InferenceSession(MODEL_PATH, sess_options=opts, providers=["CPUExecutionProvider"])
    iname = sess.get_inputs()[0].name

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(json.dumps({"error": "could not open video"}), file=sys.stderr); sys.exit(1)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = frame_count / fps if fps > 0 else 0
    sample_interval = max(1, int(round(fps / frame_rate)))

    tracker = IoUTracker()
    detections = []
    processed = 0
    fi = 0
    t0 = time.time()
    while True:
        ret, frame = cap.read()
        if not ret: break
        if fi % sample_interval == 0 and processed < max_frames:
            ts = fi / fps
            small = cv2.resize(frame, (INPUT_SIZE, INPUT_SIZE))
            small_rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
            inp = small_rgb[None].astype(np.uint8)
            out = sess.run(None, {iname: inp})
            boxes, classes, scores, num_det = out[0], out[1], out[2], out[3]
            n = int(num_det[0]) if num_det.ndim == 1 else int(num_det[0][0])
            frame_dets = []
            for i in range(min(n, scores.shape[1])):
                sc = float(scores[0][i])
                if sc < confidence: continue
                cid = int(classes[0][i])
                if cid not in COCO_TO_INTERNAL: continue
                y1, x1, y2, x2 = boxes[0][i].tolist()
                det = {
                    "frame_index": fi, "timestamp": ts,
                    "class_id": cid, "class_name": COCO_TO_INTERNAL[cid],
                    "internal_class": COCO_TO_INTERNAL[cid],
                    "confidence": sc,
                    "x1": float(x1), "y1": float(y1), "x2": float(x2), "y2": float(y2),
                }
                detections.append(det)
                frame_dets.append({"internal_class": COCO_TO_INTERNAL[cid], "box": [float(x1), float(y1), float(x2), float(y2)]})
            tracker.update(frame_dets, ts, fi)
            processed += 1
            del frame, small, small_rgb, inp, out, boxes, classes, scores
            gc.collect()
        fi += 1
    cap.release()

    result = {
        "detections": detections,
        "tracks": tracker.active(),
        "frames_processed": processed,
        "duration_sec": duration,
        "fps": fps,
        "width": width,
        "height": height,
        "model": "ssd-mobilenet-v1-coco-onnx",
        "elapsed_ms": (time.time() - t0) * 1000,
    }
    print(json.dumps(result))

if __name__ == "__main__":
    main()
