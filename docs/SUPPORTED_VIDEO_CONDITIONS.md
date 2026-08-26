# Supported Video Conditions — AI Traffic Analyzer

## Recommended Video Specifications

| Parameter | Recommended | Minimum | Notes |
|---|---|---|---|
| Resolution | 720p (1280×720) | 480p (640×360) | Higher resolution improves detection of distant vehicles |
| FPS | 30 | 15 | The analyzer samples at 2 FPS by default (configurable) |
| Duration | 30–300 seconds | 5 seconds | Longer videos work but take more processing time |
| Codec | H.264 (MP4) | Any FFmpeg-supported | H.264 probes fastest; MPEG-4 Part 2 also works |
| Container | .mp4 | .mov, .avi, .mkv, .webm, .m4v | All accepted, MP4 preferred |
| File size | < 100 MB | < 1 GB (configurable) | Stream-to-disk handles large files; Vercel has 4.5 min timeout |

## Recommended Camera Setup

| Parameter | Recommended | Notes |
|---|---|---|
| Camera angle | Eye-level or slight overhead | Aerial/top-down views produce 0 detections (model limitation) |
| Distance | Vehicles fill >10% of frame width | Distant vehicles (<5% frame width) are missed |
| Lighting | Daylight or well-lit | Dark/night footage: model detects vehicles but with lower recall |
| Traffic density | Moderate (5–20 vehicles visible) | Sparse traffic (<1 vehicle/frame) may produce 0 detections |
| Camera stability | Fixed or minimal shake | Heavy shake degrades tracking quality |
| Weather | Clear | Rain/fog reduces detection accuracy |

## Known Limitations

### Model: SSD MobileNet v1 COCO (ONNX, Apache-2.0)

1. **Aerial/top-down geometry**: The model was trained on eye-level photos. Aerial drone footage (looking straight down) produces 0 detections. Use eye-level or slight-overhead angles.

2. **Sparse/distant traffic**: When vehicles are small (<5% of frame width) or the scene is mostly empty, the model may not detect any vehicles. This is a conservative model behavior (high precision, lower recall).

3. **Low-light conditions**: Darkened footage reduces recall but does not eliminate detection. The model still detects vehicles that are clearly visible in the darkened frame.

4. **Occlusion**: Partially occluded vehicles (behind trees, poles, other vehicles) may be missed. The IoU tracker handles brief occlusion (≤2 frames) but not extended occlusion.

5. **Recall vs Precision tradeoff**: At confidence threshold 0.4, the model achieves 100% precision (0 false positives) but only ~40% recall (misses ~60% of vehicles). Lower the threshold to 0.3 for higher recall (more false positives).

### Measured Performance (5-video validation corpus)

| Video | Condition | Detections | Tracks | Status |
|---|---|---|---|---|
| Day highway | Normal daytime | 195 | 11 | ✅ Works |
| Long 90s | Normal daytime (extended) | 179 | 11 | ✅ Works |
| Aerial | Top-down geometry | 0 | 0 | ❌ No detections |
| Sparse suburban | Distant vehicles | 0 | 0 | ❌ No detections |
| Dark | Darkened footage | 99 | 7 | ✅ Works (reduced) |

### What to do if you get 0 detections

1. **Lower the confidence threshold** in Settings (e.g. from 0.4 to 0.3 or 0.25)
2. **Check camera angle** — eye-level works best; aerial may not work at all
3. **Check vehicle size** — vehicles should fill at least 5–10% of the frame width
4. **Try a different video** — some footage simply doesn't match the model's training distribution
5. **Consider a model swap** — the VisionProvider interface supports any ONNX model. See `docs/MODEL_LICENSE.md` for alternatives (Faster R-CNN, EfficientDet, RT-DETR)

## Supported Codecs (via FFmpeg)

| Codec | Extension | Probing | Notes |
|---|---|---|---|
| H.264 | .mp4 | ✅ Fast | Recommended |
| H.265/HEVC | .mp4 | ✅ Fast | |
| MPEG-4 Part 2 | .mp4 | ✅ Fast | |
| VP8 | .webm | ✅ Fast | |
| VP9 | .webm | ✅ Fast | |
| Motion JPEG | .avi | ✅ | |

## Environment Requirements

| Component | Required | For |
|---|---|---|
| Node.js 20+ / Bun | Yes | Web app |
| FFmpeg + ffprobe | Yes | Video probing + frame extraction |
| Python 3.10+ | For real AI | ONNX inference (local-inference provider) |
| OpenCV (pip) | For real AI | Frame extraction |
| ONNX Runtime (pip) | For real AI | Model inference |
| SQLite | Default DB | Local development |
| PostgreSQL | For Vercel | Serverless deployment |
