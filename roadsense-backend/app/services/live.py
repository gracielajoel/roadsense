"""
Inference live scan: satu frame JPEG dari kamera HP -> daftar deteksi.

HP hanya mengambil & mengompres frame (murah untuk baterai), semua inference di server.
Model live memakai instance YOLO TERPISAH dari pemrosesan video, supaya video panjang
yang sedang diproses tidak membuat live scan menunggu (dan state tracker tidak bentrok).

bbox = [x, y, lebar, tinggi], 0-1, x/y = pojok kiri-atas (sama seperti inference.py).
"""
from __future__ import annotations

import math
import random
import threading
from dataclasses import dataclass

from ..config import LIVE_CONF, MODEL_IMGSZ, USE_DUMMY_INFERENCE
from .classes import to_damage_code
from .inference import load_model


@dataclass
class FrameDetection:
    damage_type: str       # D00 | D10 | D20 | D40
    confidence: float      # 0-1
    bbox: list[float]      # [x, y, w, h], 0-1


_live_model = None
_live_lock = threading.Lock()


def _get_live_model():
    global _live_model
    if _live_model is None:
        _live_model = load_model()
    return _live_model


def _detect_real(jpeg: bytes) -> list[FrameDetection]:
    import cv2
    import numpy as np

    img = cv2.imdecode(np.frombuffer(jpeg, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Frame bukan gambar yang valid")

    with _live_lock:  # predictor ultralytics tidak thread-safe
        model = _get_live_model()
        r = model.predict(img, imgsz=MODEL_IMGSZ, conf=LIVE_CONF, verbose=False)[0]

    out = []
    if r.boxes is not None:
        for cls, conf, (x1, y1, x2, y2) in zip(
            r.boxes.cls.tolist(), r.boxes.conf.tolist(), r.boxes.xyxyn.tolist()
        ):
            x1, y1, x2, y2 = (min(max(float(v), 0.0), 1.0) for v in (x1, y1, x2, y2))
            out.append(
                FrameDetection(
                    damage_type=to_damage_code(int(cls), model.names),
                    confidence=round(float(conf), 4),
                    bbox=[round(x1, 4), round(y1, 4), round(x2 - x1, 4), round(y2 - y1, 4)],
                )
            )
    return out


# Kerusakan palsu yang sedang "terlihat": muncul di tengah jalan lalu bergerak turun & membesar
# selama beberapa frame (seperti mobil yang mendekat), supaya deduplikasi ikut teruji.
_dummy_state: dict | None = None


def _detect_dummy(_jpeg: bytes) -> list[FrameDetection]:
    global _dummy_state
    with _live_lock:
        s = _dummy_state
        if s is None:
            if random.random() > 0.15:
                return []
            s = _dummy_state = {
                "type": random.choice(["D00", "D10", "D20", "D40"]),
                "x": random.uniform(0.3, 0.55),
                "frames_left": random.randint(2, 4),
                "step": 0,
            }
        k = s["step"]
        w, h = 0.12 + 0.05 * k, 0.07 + 0.03 * k
        det = FrameDetection(
            damage_type=s["type"],
            confidence=round(min(0.97, random.uniform(0.45, 0.7) + 0.08 * k), 4),
            bbox=[round(s["x"] - 0.02 * k, 4), round(min(0.55 + 0.08 * k, 1 - h), 4), round(w, 4), round(h, 4)],
        )
        s["step"] += 1
        s["frames_left"] -= 1
        if s["frames_left"] <= 0:
            _dummy_state = None
        return [det]


def detect_frame(jpeg: bytes) -> list[FrameDetection]:
    if USE_DUMMY_INFERENCE:
        return _detect_dummy(jpeg)
    return _detect_real(jpeg)


def distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Jarak dua titik GPS dalam meter (haversine)."""
    r = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))
