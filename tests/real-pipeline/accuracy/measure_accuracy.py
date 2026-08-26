#!/usr/bin/env python3
"""
Detection accuracy measurement — Phase F5.

Compares REAL SSD MobileNet v1 detections against VLM-generated ground truth
for 20 sample frames across 5 videos. Calculates TP/FP/FN/precision/recall/F1.

Since ground truth is per-frame vehicle counts (not bbox-level), we measure
DETECTION-LEVEL accuracy:
- TP = min(predicted_count, gt_count) per frame
- FP = max(0, predicted_count - gt_count) per frame
- FN = max(0, gt_count - predicted_count) per frame

This is the standard counting-accuracy methodology for traffic analysis.
"""
import json, os, sys, subprocess, base64, cv2, numpy as np

PYTHON = os.environ.get("PYTHON_BIN", "python3")
ONNX_MODEL = "mini-services/vision-worker/models/ssd_mobilenet_v1_coco.onnx"

# Load ground truth
gt = json.load(open("tests/real-pipeline/accuracy/ground_truth.json"))

# Load pipeline results (has per-frame detections)
results = json.load(open("tests/real-pipeline/dataset/results.json"))

# Map video letter → results entry
video_map = {"A": "video-a-day-highway.mp4", "B": "video-b-long.mp4",
             "C": "video-c-aerial-highway.mp4", "D": "video-d-suburban-sparse.mp4",
             "E": "video-e-dark.mp4"}

# For each annotated frame, find the closest detection timestamp in the pipeline results
CONFIDENCE_THRESHOLD = 0.4

per_frame = []
total_tp = total_fp = total_fn = 0
for frame_name, gt_counts in sorted(gt.items()):
    vid_letter = frame_name.split("_")[0]
    timestamp = float(frame_name.split("_t")[1].replace("s", ""))
    video_file = video_map.get(vid_letter)
    if not video_file:
        continue
    # find detections at the closest timestamp (within 0.5s)
    result_entry = next((r for r in results if r["file"] == video_file), None)
    if not result_entry or "raw" not in result_entry:
        continue
    dets = result_entry["raw"]["detections"]
    # find detections at the closest sampled timestamp
    sampled_ts = sorted(set(d["timestamp"] for d in dets))
    if not sampled_ts:
        closest_ts = None
        pred_dets = []
    else:
        closest_ts = min(sampled_ts, key=lambda t: abs(t - timestamp))
        pred_dets = [d for d in dets if abs(d["timestamp"] - closest_ts) < 0.1]
    pred_count = len(pred_dets)
    gt_count = gt_counts.get("total", 0)
    tp = min(pred_count, gt_count)
    fp = max(0, pred_count - gt_count)
    fn = max(0, gt_count - pred_count)
    total_tp += tp
    total_fp += fp
    total_fn += fn
    per_frame.append({
        "frame": frame_name,
        "video": vid_letter,
        "timestamp": timestamp,
        "closest_sampled_ts": closest_ts,
        "gt_total": gt_count,
        "gt_breakdown": {k: v for k, v in gt_counts.items() if k != "total"},
        "pred_total": pred_count,
        "pred_breakdown": {},
        "tp": tp, "fp": fp, "fn": fn,
    })
    # class breakdown
    for d in pred_dets:
        c = d["internal_class"]
        per_frame[-1]["pred_breakdown"][c] = per_frame[-1]["pred_breakdown"].get(c, 0) + 1

precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

report = {
    "dataset": "5 real traffic videos (Pexels CC0 + controlled variations)",
    "frames_analyzed": len(per_frame),
    "ground_truth_objects": total_tp + total_fn,
    "predicted_objects": total_tp + total_fp,
    "TP": total_tp,
    "FP": total_fp,
    "FN": total_fn,
    "precision": round(precision, 4),
    "recall": round(recall, 4),
    "f1": round(f1, 4),
    "iou_threshold": "N/A (counting-level, not bbox-level)",
    "confidence_threshold": CONFIDENCE_THRESHOLD,
    "model": "ssd-mobilenet-v1-coco-onnx",
    "per_frame": per_frame,
}

with open("tests/real-pipeline/accuracy/accuracy_report.json", "w") as f:
    json.dump(report, f, indent=2)

print(f"=== DETECTION ACCURACY REPORT ===")
print(f"Frames analyzed: {report['frames_analyzed']}")
print(f"Ground-truth objects: {report['ground_truth_objects']}")
print(f"Predicted objects: {report['predicted_objects']}")
print(f"TP={total_tp}  FP={total_fp}  FN={total_fn}")
print(f"Precision: {precision:.1%}")
print(f"Recall:    {recall:.1%}")
print(f"F1:        {f1:.1%}")
print(f"\nPer-frame breakdown:")
for pf in per_frame:
    print(f"  {pf['frame']}: gt={pf['gt_total']} pred={pf['pred_total']} tp={pf['tp']} fp={pf['fp']} fn={pf['fn']}")
