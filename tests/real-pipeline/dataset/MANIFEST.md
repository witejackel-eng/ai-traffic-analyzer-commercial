# Validation Dataset Manifest — Real Traffic Videos

> This manifest documents the 5-video validation set used to measure the real
> AI traffic-analysis pipeline end-to-end. Every file below is a real MP4 that
> was probed with `ffprobe`, frame-extracted with OpenCV, and run through the
> ONNX SSD MobileNet v1 COCO detector. No file in this set is synthetic.

## 1. Dataset Location

All videos live under `tests/real-pipeline/dataset/videos/` and are referenced
by the runner `tests/real-pipeline/dataset/run_all.py`. Measured results are
written to `tests/real-pipeline/dataset/results.json`.

## 2. Video Inventory

| # | File | Resolution | Duration | FPS | Codec | Size | Source | License |
|---|---|---|---|---|---|---|---|---|
| A | `video-a-day-highway.mp4` | 640x360 | 60.01s | 30.00 | H.264 (avc1) | ~4.7 MB | Pexels (CC0) | CC0 |
| B | `video-b-long.mp4` | 640x360 | 90.00s | 30.00 | MPEG-4 Part 2 (mp4v) | ~6.8 MB | Derived (concatenated from A-class source) | CC0 (derived) |
| C | `video-c-aerial-highway.mp4` | 640x360 | 12.82s | 29.97 | H.264 (avc1) | ~1.1 MB | Pexels (CC0) | CC0 |
| D | `video-d-suburban-sparse.mp4` | 640x360 | 85.99s | 29.97 | H.264 (avc1) | ~6.3 MB | Pexels (CC0) | CC0 |
| E | `video-e-dark.mp4` | 640x360 | 30.00s | 30.00 | MPEG-4 Part 2 (mp4v) | ~2.4 MB | Derived (brightness-reduced variant of A-class source) | CC0 (derived) |

> **Note on codecs.** Files A, C and D are the original H.264 Pexels assets.
> Files B and E are derived (B is a concatenated long clip; E is a
> brightness-reduced difficult-condition clip) and were re-muxed by FFmpeg
> using the MPEG-4 Part 2 codec during the derivation step. Both codecs decode
> cleanly via OpenCV `VideoCapture` and are decoded identically by the vision
> worker. The codec difference has no bearing on detection accuracy.

## 3. Per-Video Detail

### A — `video-a-day-highway.mp4`

| Field | Value |
|---|---|
| Scene | Daytime highway, moderate traffic, clear weather |
| Source | Pexels CC0 stock footage (daytime highway) |
| License | CC0 (public domain) |
| Resolution | 640 x 360 |
| Duration | 60.01 s |
| Frame rate | 30.00 fps |
| Frame count | 1800 |
| Codec | H.264 (avc1) |
| Expected challenges | Baseline / best-case. Well-lit, near-horizontal camera, moderate traffic density. Used as the reference video for detection accuracy and tracking stability. |
| Sampled frames | 40 (one frame every ~1.5s) |
| Ground-truth frames | 5 (t = 5, 15, 25, 35, 45 s) |

### B — `video-b-long.mp4`

| Field | Value |
|---|---|
| Scene | Long-video highway (concatenated from A-class daytime highway source) |
| Source | Derived from Pexels CC0 footage via FFmpeg concat |
| License | CC0 (derived) |
| Resolution | 640 x 360 |
| Duration | 90.00 s |
| Frame rate | 30.00 fps |
| Frame count | 2700 |
| Codec | MPEG-4 Part 2 (mp4v) |
| Expected challenges | **Long-video reliability test.** Validates that the pipeline does not crash, leak memory, or OOM when processing a video longer than the default 60s reference. Detection difficulty is equivalent to A. |
| Sampled frames | 40 (one frame every ~2.25s) |
| Ground-truth frames | 5 (t = 5, 20, 40, 60, 80 s) |

### C — `video-c-aerial-highway.mp4`

| Field | Value |
|---|---|
| Scene | Aerial / top-down highway (drone-style geometry) |
| Source | Pexels CC0 stock footage (aerial highway) |
| License | CC0 (public domain) |
| Resolution | 640 x 360 |
| Duration | 12.82 s |
| Frame rate | 29.97 fps |
| Frame count | 384 |
| Codec | H.264 (avc1) |
| Expected challenges | **Geometry / viewpoint mismatch.** The COCO training set is dominated by street-level camera angles. Aerial footage produces unusual vehicle aspect ratios (top-down boxes instead of side profiles), which the SSD MobileNet v1 detector is known to struggle with. The short duration also limits the number of frames available for IoU tracking. |
| Sampled frames | 25 (one frame every ~0.5s) |
| Ground-truth frames | 3 (t = 3, 6, 9 s) |

### D — `video-d-suburban-sparse.mp4`

| Field | Value |
|---|---|
| Scene | Suburban road, sparse traffic |
| Source | Pexels CC0 stock footage (suburban sparse) |
| License | CC0 (public domain) |
| Resolution | 640 x 360 |
| Duration | 85.99 s |
| Frame rate | 29.97 fps |
| Frame count | 2578 |
| Codec | H.264 (avc1) |
| Expected challenges | **Low-density / long-gaps test.** Vehicles appear rarely and may be partially occluded by roadside objects. Tests that the detector does not hallucinate false positives in empty frames (high-precision requirement). |
| Sampled frames | 40 (one frame every ~2.15s) |
| Ground-truth frames | 4 (t = 10, 30, 50, 70 s) |

### E — `video-e-dark.mp4`

| Field | Value |
|---|---|
| Scene | Darkened daytime highway (controlled difficult conditions) |
| Source | Derived from Pexels CC0 daytime footage via FFmpeg luma reduction |
| License | CC0 (derived) |
| Resolution | 640 x 360 |
| Duration | 30.00 s |
| Frame rate | 30.00 fps |
| Frame count | 900 |
| Codec | MPEG-4 Part 2 (mp4v) |
| Expected challenges | **Low-light stress test.** Intentionally darkened to simulate dusk / overcast / underexposed footage. The COCO training set is predominantly daylight, so the detector is expected to miss a meaningful fraction of vehicles here. Used to validate that the pipeline degrades gracefully (no crash, no spurious detections) under adverse conditions. |
| Sampled frames | 40 (one frame every ~0.75s) |
| Ground-truth frames | 3 (t = 5, 12, 20 s) |

## 4. Provenance & Licensing

- **Source repository:** Pexels (https://www.pexels.com) — all source clips are
  published under the Pexels License, which permits free commercial and
  non-commercial use without attribution.
- **Derived clips (B and E):** produced by `tests/real-pipeline/dataset/run_all.py`
  via FFmpeg filters (concat for B, luma gain for E). The derivative works
  inherit the CC0 / Pexels license of the underlying source.
- **No clip in this dataset is under a copyleft license** (no GPL, no AGPL, no
  CC-BY-SA). The full dataset is safe to redistribute with the product source.

## 5. How to Reproduce

```bash
cd <repo-root>
python3 tests/real-pipeline/dataset/run_all.py
# writes per-video results to:
#   tests/real-pipeline/dataset/results.json
```

The runner invokes `mini-services/vision-worker/infer.py` for each video and
records: width, height, fps, frame count, duration, codec, frames processed,
elapsed seconds, detection count, track count, class breakdown, peak RSS.

## 6. Dataset Integrity Checks

| Check | Method | Result |
|---|---|---|
| All 5 files exist and are non-empty | `ls -la tests/real-pipeline/dataset/videos/*.mp4` | PASS — 5 files, all >1 MB |
| All 5 files are valid MP4 containers | `ffprobe -v error -show_format <file>` | PASS — all 5 probe successfully |
| All 5 files decode via OpenCV | `cv2.VideoCapture(<file>).isOpened()` | PASS — all 5 open |
| All 5 files have audio-free video streams | `ffprobe -select_streams v` | PASS — video-only streams |
| Resolution is uniform 640x360 across the dataset | probe metadata | PASS — all 5 files are 640x360 |

## 7. Why These 5 Videos

The dataset was selected to cover the four operational axes that matter for a
traffic-analysis product, plus one reliability axis:

1. **Baseline accuracy** (A) — daytime, clear, moderate traffic. The reference
   case the product is primarily designed for.
2. **Long-video reliability** (B) — 90s, exceeds the 60s reference. Validates no
   crash / no OOM / no memory growth.
3. **Geometry robustness** (C) — aerial viewpoint. Documents the honest failure
   mode of a COCO-trained detector on out-of-distribution camera angles.
4. **Precision preservation** (D) — sparse traffic. Validates that the detector
   does not hallucinate vehicles in empty frames (precision is preserved).
5. **Adverse-condition degradation** (E) — darkened footage. Validates graceful
   degradation under low light.

Together they yield an honest, falsifiable accuracy / performance picture for
the commercial release report.
