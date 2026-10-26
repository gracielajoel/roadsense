"""
KONTRAK dengan tim Computer Vision (Nelson / Jonathan).
Versi ini SEMENTARA: pakai weights YOLO dari teman (storage/weights/best.pt) + BoT-SORT.
Ganti isi process_video() dengan model final tim CV,
tapi JANGAN ubah signature dan bentuk return-nya.
"""
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from ..config import (
    INFERENCE_CONF,
    INFERENCE_MIN_HITS,
    INFERENCE_VID_STRIDE,
    MODEL_PATH,
)


@dataclass
class DetectedEvent:
    track_id: int
    damage_type: str          # D00 | D10 | D20 | D40
    confidence: float         # 0-1
    timestamp_sec: float      # detik di video
    evidence_image_path: str  # file screenshot (path absolut/relatif ke storage)
    frame: int | None = None                # nomor frame di video
    bbox: list[float] | None = None         # [x, y, lebar, tinggi], relatif 0-1


_model = None


def _get_model():
    """Load model sekali saja (berat), dipakai ulang untuk job berikutnya."""
    global _model
    if _model is None:
        if not Path(MODEL_PATH).exists():
            raise FileNotFoundError(f"Weights model tidak ditemukan: {MODEL_PATH}")
        from ultralytics import YOLO

        _model = YOLO(str(MODEL_PATH))
    return _model


def process_video(
    video_path: str,
    evidence_dir: Path,
    on_progress: Callable[[int], None] | None = None,
) -> list[DetectedEvent]:
    import cv2

    model = _get_model()

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    cap.release()

    # Satu kerusakan = satu track_id. Simpan deteksi dengan confidence tertinggi per track.
    best: dict[int, dict] = {}
    hits: dict[int, int] = {}
    last_pct = -1

    results = model.track(
        source=video_path,
        stream=True,
        persist=True,
        tracker="botsort.yaml",
        conf=INFERENCE_CONF,
        vid_stride=INFERENCE_VID_STRIDE,
        verbose=False,
    )
    for i, r in enumerate(results):
        frame_idx = i * INFERENCE_VID_STRIDE
        boxes = r.boxes
        if boxes is not None and boxes.id is not None:
            for tid, cls, conf, xyxy in zip(
                boxes.id.int().tolist(),
                boxes.cls.int().tolist(),
                boxes.conf.tolist(),
                boxes.xyxyn.tolist(),
            ):
                hits[tid] = hits.get(tid, 0) + 1
                if tid not in best or conf > best[tid]["conf"]:
                    x1, y1, x2, y2 = xyxy
                    best[tid] = {
                        "cls": model.names[cls],
                        "conf": conf,
                        "frame": frame_idx,
                        "bbox": [x1, y1, x2 - x1, y2 - y1],
                        "image": r.orig_img.copy(),
                    }

        pct = min(99, int(frame_idx / total * 100))
        if on_progress and pct != last_pct:
            on_progress(pct)
            last_pct = pct

    # Buang track yang cuma muncul sekali-dua kali (biasanya noise)
    events = []
    prefix = uuid.uuid4().hex[:8]
    for tid, d in sorted(best.items(), key=lambda kv: kv[1]["frame"]):
        if hits[tid] < INFERENCE_MIN_HITS:
            continue
        img = d["image"]
        h, w = img.shape[:2]
        x, y, bw, bh = d["bbox"]
        p1 = (int(x * w), int(y * h))
        p2 = (int((x + bw) * w), int((y + bh) * h))
        cv2.rectangle(img, p1, p2, (92, 92, 255), 3)
        cv2.putText(img, f"{d['cls']} {d['conf']:.2f}", (p1[0], max(20, p1[1] - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (92, 92, 255), 2)
        path = evidence_dir / f"{prefix}_{tid}.jpg"
        cv2.imwrite(str(path), img)

        events.append(DetectedEvent(
            track_id=tid,
            damage_type=d["cls"],
            confidence=round(d["conf"], 4),
            timestamp_sec=round(d["frame"] / fps, 2),
            evidence_image_path=str(path),
            frame=d["frame"],
            bbox=[round(v, 4) for v in d["bbox"]],
        ))

    if on_progress:
        on_progress(100)
    return events
