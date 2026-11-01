"""
Inference RoadSense: YOLO26s (fine-tuned) + BoT-SORT + deduplication.

KONTRAK (dipakai routers/videos.py, jangan diubah):
    process_video(video_path, evidence_dir, on_progress) -> list[DetectedEvent]

Satu Track ID = satu DetectedEvent. Evidence = frame dengan confidence tertinggi
dari track itu; `frame`, `timestamp_sec`, `bbox`, `confidence`, dan `damage_type`
semuanya diambil dari frame evidence tersebut, jadi saling konsisten.

bbox = [x, y, lebar, tinggi], 0-1 relatif ukuran frame,
       x,y = pojok KIRI-ATAS kotak (bukan titik tengah).
"""
from __future__ import annotations

import math
import re
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from ..config import (
    MIN_TRACK_FRAMES,
    MODEL_CONF,
    MODEL_IMGSZ,
    MODEL_PATH,
    TRACKER_CONFIG,
    USE_DUMMY_INFERENCE,
    VID_STRIDE,
)
from .classes import to_damage_code, validate_model_classes


@dataclass
class DetectedEvent:
    track_id: int
    damage_type: str          # D00 | D10 | D20 | D40
    confidence: float         # 0-1
    timestamp_sec: float      # detik di video (frame evidence / fps)
    evidence_image_path: str  # file screenshot
    frame: int | None = None          # nomor frame evidence (0-based, frame video asli)
    bbox: list[float] | None = None   # [x, y, w, h], 0-1, x/y = kiri-atas


# --------------------------------------------------------------------------
# Model (dimuat sekali, saat video pertama diproses)
# --------------------------------------------------------------------------
_model = None
_model_lock = threading.Lock()
_infer_lock = threading.Lock()  # tracker menyimpan state -> satu video diproses satu per satu


def _get_model():
    global _model
    with _model_lock:
        if _model is None:
            if not MODEL_PATH.is_file():
                raise FileNotFoundError(
                    f"Model tidak ditemukan di {MODEL_PATH}. Taruh file .pt di folder weights/ "
                    "dan atur MODEL_PATH di .env"
                )
            try:
                from ultralytics import YOLO
            except ImportError as exc:
                raise RuntimeError("Library ultralytics belum terpasang (pip install ultralytics)") from exc
            model = YOLO(str(MODEL_PATH))
            validate_model_classes(model.names)  # pastikan 4 kelas D00/D10/D20/D40
            _model = model
        return _model


# --------------------------------------------------------------------------
# Helper
# --------------------------------------------------------------------------
def _probe_video(video_path: str) -> tuple[float, int]:
    """Baca fps & jumlah frame (metadata). Pengecekan sama seperti notebook CV."""
    import cv2

    cap = cv2.VideoCapture(str(video_path))
    try:
        if not cap.isOpened():
            raise RuntimeError("Video tidak dapat dibuka.")
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    finally:
        cap.release()
    if not math.isfinite(fps) or fps <= 0:
        raise RuntimeError("FPS video tidak valid. Gunakan video lain.")
    return fps, max(total, 0)


def _to_xywh(x1: float, y1: float, x2: float, y2: float) -> list[float]:
    x1, y1, x2, y2 = (min(max(float(v), 0.0), 1.0) for v in (x1, y1, x2, y2))
    return [round(x1, 4), round(y1, 4), round(x2 - x1, 4), round(y2 - y1, 4)]


@dataclass
class _Track:
    n_frames: int = 0
    best_conf: float = -1.0
    best_frame: int = 0
    best_code: str = ""
    best_bbox: list[float] | None = None
    evidence: Path | None = None


# --------------------------------------------------------------------------
# Inference asli
# --------------------------------------------------------------------------
def _process_video_real(
    video_path: str,
    evidence_dir: Path,
    on_progress: Callable[[int], None] | None,
) -> list[DetectedEvent]:
    import cv2

    evidence_dir = Path(evidence_dir)
    evidence_dir.mkdir(parents=True, exist_ok=True)
    fps, total_frames = _probe_video(video_path)
    prefix = re.sub(r"[^A-Za-z0-9_-]", "_", Path(video_path).stem)[:60]

    tracks: dict[int, _Track] = {}
    last_pct = 0

    with _infer_lock:
        model = _get_model()
        results = model.track(
            source=str(video_path),
            stream=True,
            persist=False,
            tracker=TRACKER_CONFIG,
            imgsz=MODEL_IMGSZ,
            conf=MODEL_CONF,
            vid_stride=VID_STRIDE,
            verbose=False,
        )
        for n, r in enumerate(results):
            frame_idx = n * VID_STRIDE  # nomor frame di video asli
            boxes = r.boxes
            if boxes is not None and boxes.id is not None and len(boxes) > 0:
                ids = boxes.id.tolist()
                classes = boxes.cls.tolist()
                confs = boxes.conf.tolist()
                coords = boxes.xyxyn.tolist()
                for tid, cls, conf, xyxyn in zip(ids, classes, confs, coords):
                    tid = int(tid)
                    t = tracks.setdefault(tid, _Track())
                    t.n_frames += 1
                    if conf > t.best_conf:
                        t.best_conf = float(conf)
                        t.best_frame = frame_idx
                        t.best_code = to_damage_code(int(cls), model.names)
                        t.best_bbox = _to_xywh(*xyxyn)
                        t.evidence = evidence_dir / f"{prefix}_track{tid}.jpg"
                        ok = cv2.imwrite(
                            str(t.evidence), r.orig_img, [cv2.IMWRITE_JPEG_QUALITY, 90]
                        )
                        if not ok:
                            raise RuntimeError("Gagal menyimpan screenshot evidence.")

            if on_progress and total_frames:
                pct = min(99, int((frame_idx + 1) * 100 / total_frames))
                if pct > last_pct:
                    last_pct = pct
                    on_progress(pct)

    events: list[DetectedEvent] = []
    for tid, t in tracks.items():
        if t.n_frames < MIN_TRACK_FRAMES:  # kemungkinan false detection -> buang
            if t.evidence:
                t.evidence.unlink(missing_ok=True)
            continue
        events.append(
            DetectedEvent(
                track_id=tid,
                damage_type=t.best_code,
                confidence=round(t.best_conf, 4),
                timestamp_sec=round(t.best_frame / fps, 3),
                evidence_image_path=str(t.evidence),
                frame=t.best_frame,
                bbox=t.best_bbox,
            )
        )
    events.sort(key=lambda e: e.timestamp_sec)
    return events


# --------------------------------------------------------------------------
# Dummy (cadangan demo: USE_DUMMY_INFERENCE=true)
# --------------------------------------------------------------------------
def _process_video_dummy(video_path, evidence_dir, on_progress) -> list[DetectedEvent]:
    import time

    evidence_dir = Path(evidence_dir)
    evidence_dir.mkdir(parents=True, exist_ok=True)
    fake = [
        (1, "D40", 0.91, 3.2, [0.42, 0.55, 0.18, 0.12]),
        (2, "D00", 0.78, 8.5, [0.30, 0.60, 0.40, 0.08]),
        (3, "D20", 0.84, 14.0, [0.50, 0.50, 0.25, 0.20]),
    ]
    results = []
    for i, (tid, dtype, conf, ts, box) in enumerate(fake, start=1):
        time.sleep(1)
        img = evidence_dir / f"dummy_{tid}.jpg"
        img.write_bytes(b"")
        results.append(DetectedEvent(tid, dtype, conf, ts, str(img), frame=int(ts * 30), bbox=box))
        if on_progress:
            on_progress(int(i / len(fake) * 100))
    return results


# --------------------------------------------------------------------------
# Titik masuk (kontrak)
# --------------------------------------------------------------------------
def process_video(
    video_path: str,
    evidence_dir: Path,
    on_progress: Callable[[int], None] | None = None,
) -> list[DetectedEvent]:
    if USE_DUMMY_INFERENCE:
        return _process_video_dummy(video_path, evidence_dir, on_progress)
    return _process_video_real(video_path, evidence_dir, on_progress)