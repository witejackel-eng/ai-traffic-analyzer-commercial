"""
Vision Worker — REAL AI inference service for AI Traffic Analyzer.

A Python/FastAPI microservice that runs REAL vehicle detection using an ONNX
MobileNet-SSD v1 model trained on COCO (Apache-2.0 license, commercially
usable) + a real IoU-based multi-object tracker.

Model: ssd_mobilenet_v1_coco (ONNX, 18MB, Apache-2.0)
  - Source: ONNX Model Zoo (github.com/onnx/models)
  - License: Apache-2.0 (commercially usable)
  - Trained on: COCO dataset (CC-BY-4.0)
  - Detects: car, motorcycle, bus, truck, bicycle (+ 86 other COCO classes)

Memory footprint: ~250MB total (vs ~1.5GB for Faster R-CNN). Suitable for
the 4GB sandbox host.

License summary:
  - ONNX model weights: Apache-2.0
  - onnxruntime: MIT
  - OpenCV: Apache-2.0
  - FastAPI: MIT
  All components permit commercial use. No AGPL contamination.
"""
from __future__ import annotations
import base64
import gc
import os
import time
import logging
from typing import List, Optional, Dict, Any

import cv2
import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

logger = logging.getLogger("vision-worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "ssd_mobilenet_v1_coco.onnx")
INPUT_SIZE = 300
CONFIDENCE_DEFAULT = 0.4

# COCO class IDs → internal vehicle classes
COCO_TO_INTERNAL = {
    3: "car",
    4: "motorcycle",
    6: "bus",
    8: "truck",
    2: "bicycle",
}

_SESSION: Optional[ort.InferenceSession] = None


def get_session() -> ort.InferenceSession:
    global _SESSION
    if _SESSION is not None:
        return _SESSION
    if not os.path.isfile(MODEL_PATH):
        raise RuntimeError(f"Model file not found: {MODEL_PATH}")
    # Use optimized session options for low-memory CPU inference.
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 2
    opts.inter_op_num_threads = 1
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    _SESSION = ort.InferenceSession(MODEL_PATH, sess_options=opts, providers=["CPUExecutionProvider"])
    logger.info("ONNX SSD MobileNet v1 model loaded (COCO, Apache-2.0) from %s", MODEL_PATH)
    return _SESSION


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload the model at startup so the first request is fast.
    get_session()
    yield


app = FastAPI(title="AI Traffic Analyzer — Vision Worker", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Frame(BaseModel):
    frame_index: int = 0
    timestamp: float = 0.0
    image_b64: str
    width: Optional[int] = None
    height: Optional[int] = None


class DetectRequest(BaseModel):
    confidence: float = 0.4
    frames: List[Frame] = Field(default_factory=list)


class Detection(BaseModel):
    frame_index: int
    timestamp: float
    class_id: int
    class_name: str
    internal_class: str
    confidence: float
    x1: float  # normalized 0..1
    y1: float
    x2: float
    y2: float


class DetectResponse(BaseModel):
    detections: List[Detection]
    model: str
    elapsed_ms: float


class HealthResponse(BaseModel):
    ok: bool
    model: str
    device: str
    classes: List[str]


class Track:
    __slots__ = ("id", "cls", "boxes", "timestamps", "frames", "last_box", "missed", "last_seen")
    def __init__(self, tid: int, cls: str, box, timestamp: float, frame: int):
        self.id = tid
        self.cls = cls
        self.boxes: List[List[float]] = [list(box)]
        self.timestamps: List[float] = [timestamp]
        self.frames: List[int] = [frame]
        self.last_box = list(box)
        self.missed = 0
        self.last_seen = timestamp


class IoUTracker:
    """IoU-based multi-object tracker — assigns stable IDs across frames."""
    def __init__(self, iou_threshold: float = 0.25, max_missed: int = 2):
        self.iou_threshold = iou_threshold
        self.max_missed = max_missed
        self.tracks: List[Track] = []
        self._next_id = 1

    @staticmethod
    def _iou(a, b) -> float:
        ax1, ay1, ax2, ay2 = a
        bx1, by1, bx2, by2 = b
        ix1 = max(ax1, bx1); iy1 = max(ay1, by1)
        ix2 = min(ax2, bx2); iy2 = min(ay2, by2)
        iw = max(0.0, ix2 - ix1); ih = max(0.0, iy2 - iy1)
        inter = iw * ih
        a_area = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
        b_area = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
        union = a_area + b_area - inter
        return inter / union if union > 0 else 0.0

    def update(self, detections: List[Dict[str, Any]], timestamp: float, frame: int):
        if not self.tracks:
            for d in detections:
                self.tracks.append(Track(self._next_id, d["internal_class"], d["box"], timestamp, frame))
                self._next_id += 1
            return
        unmatched_dets = list(range(len(detections)))
        det_to_track: Dict[int, int] = {}
        for ti, t in enumerate(self.tracks):
            best_iou = self.iou_threshold
            best_di = -1
            for di in unmatched_dets:
                d = detections[di]
                if d["internal_class"] != t.cls:
                    continue
                iou = self._iou(t.last_box, d["box"])
                if iou > best_iou:
                    best_iou = iou
                    best_di = di
            if best_di >= 0:
                det_to_track[best_di] = ti
                unmatched_dets.remove(best_di)
                d = detections[best_di]
                t.boxes.append(list(d["box"]))
                t.timestamps.append(timestamp)
                t.frames.append(frame)
                t.last_box = list(d["box"])
                t.missed = 0
                t.last_seen = timestamp
        for di in unmatched_dets:
            d = detections[di]
            self.tracks.append(Track(self._next_id, d["internal_class"], d["box"], timestamp, frame))
            self._next_id += 1
        matched_tis = set(det_to_track.values())
        for ti, t in enumerate(self.tracks):
            if ti not in matched_tis:
                t.missed += 1
        self.tracks = [t for t in self.tracks if t.missed <= self.max_missed]

    def get_active_tracks(self) -> List[Dict[str, Any]]:
        return [
            {
                "track_id": t.id,
                "class": t.cls,
                "boxes": t.boxes,
                "timestamps": t.timestamps,
                "frames": t.frames,
                "first_timestamp": t.timestamps[0],
                "last_timestamp": t.timestamps[-1],
                "start_box": t.boxes[0],
                "end_box": t.boxes[-1],
                "average_confidence": 0.0,  # filled by caller if desired
            }
            for t in self.tracks
            if len(t.boxes) >= 2
        ]


def decode_b64_jpeg(b64: str) -> np.ndarray:
    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img


def run_inference_one(frame_bgr: np.ndarray, confidence: float) -> List[Dict[str, Any]]:
    """Run SSD MobileNet v1 on a single frame. Returns normalized detections."""
    sess = get_session()
    iname = sess.get_inputs()[0].name
    h, w = frame_bgr.shape[:2]
    # SSD expects 300x300 RGB uint8
    small = cv2.resize(frame_bgr, (INPUT_SIZE, INPUT_SIZE))
    small_rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
    inp = small_rgb[None].astype(np.uint8)  # NHWC uint8
    outputs = sess.run(None, {iname: inp})
    boxes = outputs[0]      # [1, N, 4] normalized [y1, x1, y2, x2]
    classes = outputs[1]    # [1, N]
    scores = outputs[2]    # [1, N]
    num_det = int(outputs[3][0]) if outputs[3].ndim == 1 else int(outputs[3][0][0])
    dets: List[Dict[str, Any]] = []
    for i in range(min(num_det, scores.shape[1])):
        sc = float(scores[0][i])
        if sc < confidence:
            continue
        cid = int(classes[0][i])
        if cid not in COCO_TO_INTERNAL:
            continue
        y1, x1, y2, x2 = boxes[0][i].tolist()
        # convert normalized [y1,x1,y2,x2] → [x1,y1,x2,y2]
        dets.append({
            "class_id": cid,
            "class_name": COCO_TO_INTERNAL[cid],
            "internal_class": COCO_TO_INTERNAL[cid],
            "confidence": sc,
            "box": [float(x1), float(y1), float(x2), float(y2)],
        })
    return dets


@app.get("/health")
async def health() -> HealthResponse:
    ok = _SESSION is not None or os.path.isfile(MODEL_PATH)
    return HealthResponse(
        ok=ok,
        model="ssd-mobilenet-v1-coco-onnx",
        device="cpu",
        classes=["car", "motorcycle", "bus", "truck", "bicycle"],
    )


@app.post("/detect", response_model=DetectResponse)
async def detect(req: DetectRequest) -> DetectResponse:
    if not req.frames:
        raise HTTPException(status_code=400, detail="No frames provided")
    t0 = time.time()
    get_session()
    detections: List[Detection] = []
    for f in req.frames:
        img = decode_b64_jpeg(f.image_b64)
        results = run_inference_one(img, req.confidence)
        for d in results:
            detections.append(Detection(
                frame_index=f.frame_index,
                timestamp=f.timestamp,
                class_id=d["class_id"],
                class_name=d["class_name"],
                internal_class=d["internal_class"],
                confidence=d["confidence"],
                x1=d["box"][0], y1=d["box"][1], x2=d["box"][2], y2=d["box"][3],
            ))
        del img
    gc.collect()
    return DetectResponse(
        detections=detections,
        model="ssd-mobilenet-v1-coco-onnx",
        elapsed_ms=(time.time() - t0) * 1000,
    )


class AnalyzeRequest(BaseModel):
    video_path: str
    frame_rate: float = 2.0
    confidence: float = 0.4
    max_frames: int = 40


class AnalyzeResponse(BaseModel):
    detections: List[Detection]
    tracks: List[Dict[str, Any]]
    frames_processed: int
    duration_sec: float
    fps: float
    width: int
    height: int
    model: str
    elapsed_ms: float


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze a local video file: probe → sample → detect (one frame at a time) → track."""
    if not os.path.isfile(req.video_path):
        raise HTTPException(status_code=404, detail=f"Video not found: {req.video_path}")
    t0 = time.time()
    cap = cv2.VideoCapture(req.video_path)
    if not cap.isOpened():
        raise HTTPException(status_code=415, detail="Could not open video (unsupported codec?)")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = frame_count / fps if fps > 0 else 0

    sample_interval = max(1, int(round(fps / req.frame_rate)))
    tracker = IoUTracker()
    all_detections: List[Detection] = []
    processed = 0
    fi = 0
    get_session()
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if fi % sample_interval == 0 and processed < req.max_frames:
            timestamp = fi / fps
            results = run_inference_one(frame, req.confidence)
            for d in results:
                all_detections.append(Detection(
                    frame_index=fi,
                    timestamp=timestamp,
                    class_id=d["class_id"],
                    class_name=d["class_name"],
                    internal_class=d["internal_class"],
                    confidence=d["confidence"],
                    x1=d["box"][0], y1=d["box"][1], x2=d["box"][2], y2=d["box"][3],
                ))
            tracker.update(results, timestamp, fi)
            processed += 1
            del frame
            gc.collect()
        fi += 1
    cap.release()
    gc.collect()
    tracks = tracker.get_active_tracks()
    return AnalyzeResponse(
        detections=all_detections,
        tracks=tracks,
        frames_processed=processed,
        duration_sec=duration,
        fps=fps,
        width=width,
        height=height,
        model="ssd-mobilenet-v1-coco-onnx",
        elapsed_ms=(time.time() - t0) * 1000,
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
