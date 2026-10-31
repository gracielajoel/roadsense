"""
KONTRAK dengan tim Computer Vision (Nelson / Jonathan).
Versi ini DUMMY. Ganti isi process_video() dengan YOLO26s + BoT-SORT + dedup asli,
tapi JANGAN ubah signature dan bentuk return-nya.
"""
from dataclasses import dataclass
from pathlib import Path
import time
from typing import Callable


@dataclass
class DetectedEvent:
    track_id: int
    damage_type: str          # D00 | D10 | D20 | D40
    confidence: float         # 0-1
    timestamp_sec: float      # detik di video
    evidence_image_path: str  # file screenshot (path absolut/relatif ke storage)
    frame: int | None = None          # nomor frame evidence di video (0-based)
    bbox: list[float] | None = None   # [x, y, lebar, tinggi], 0-1 relatif ukuran frame


def process_video(
    video_path: str,
    evidence_dir: Path,
    on_progress: Callable[[int], None] | None = None,
) -> list[DetectedEvent]:
    # --- DUMMY: pura-pura proses, return 3 event palsu ---
    fake = [
        (1, "D40", 0.91, 3.2, [0.42, 0.55, 0.18, 0.12]),
        (2, "D00", 0.78, 8.5, [0.30, 0.60, 0.40, 0.08]),
        (3, "D20", 0.84, 14.0, [0.50, 0.50, 0.25, 0.20]),
    ]
    results = []
    for i, (tid, dtype, conf, ts, box) in enumerate(fake, start=1):
        time.sleep(1)  # simulasi proses
        img = evidence_dir / f"dummy_{tid}.jpg"
        img.write_bytes(b"")  # placeholder; versi asli: cv2.imwrite(...)
        results.append(DetectedEvent(tid, dtype, conf, ts, str(img), frame=int(ts * 30), bbox=box))
        if on_progress:
            on_progress(int(i / len(fake) * 100))
    return results