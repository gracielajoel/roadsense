"""
Live scan dari HP: HP ditaruh di balik kaca depan, kirim frame kamera ~1x per detik,
server menjalankan deteksi dan langsung menyimpan Damage Event (lengkap dengan GPS).

Satu sesi live = satu baris Video (path "live/<uuid>", tanpa file video) + satu Job.
Dengan begitu event, report, statistik, dan halaman admin yang sudah ada tetap jalan
tanpa perubahan tabel. Job berstatus "processing" selama sesi berjalan, "done" saat diakhiri.

Deduplikasi: kerusakan yang sama terlihat di beberapa frame berturut-turut. Deteksi baru
digabung ke event lama yang sejenis kalau terakhir terlihat <= LIVE_MERGE_SEC detik lalu
atau berjarak <= LIVE_MERGE_METERS. Yang disimpan tetap frame dengan confidence tertinggi.
"""
import threading
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..config import LIVE_MERGE_METERS, LIVE_MERGE_SEC, MAX_FRAME_KB, STORAGE_DIR
from ..db import get_db
from ..deps import ensure_video_access, get_current_user
from ..services.live import detect_frame, distance_m

router = APIRouter(prefix="/live", tags=["live"])

LIVE_PREFIX = "live/"

# video_id -> {event_id: detik terakhir terlihat}. Hilang saat server restart,
# setelah itu timestamp_sec event (frame terbaiknya) dipakai sebagai gantinya.
_last_seen: dict[int, dict[int, float]] = {}
_session_locks: dict[int, threading.Lock] = {}
_locks_guard = threading.Lock()


def _session_lock(video_id: int) -> threading.Lock:
    with _locks_guard:
        return _session_locks.setdefault(video_id, threading.Lock())


class LiveSessionOut(BaseModel):
    video_id: int
    job_id: int


class LiveDetectionOut(BaseModel):
    damage_type: str
    confidence: float
    bbox: list[float]
    event_id: int
    is_new: bool


class LiveFrameOut(BaseModel):
    detections: list[LiveDetectionOut]
    events_total: int
    inference_ms: int


class LiveEndOut(BaseModel):
    video_id: int
    events_total: int


def _get_live_session(db: Session, video_id: int, user: models.User) -> tuple[models.Video, models.Job]:
    video = db.get(models.Video, video_id)
    if not video or not video.path.startswith(LIVE_PREFIX):
        raise HTTPException(404, "Sesi live tidak ditemukan")
    ensure_video_access(user, video)
    job = db.query(models.Job).filter_by(video_id=video_id).order_by(models.Job.id.desc()).first()
    return video, job


@router.post("/sessions", response_model=LiveSessionOut, status_code=201)
def start_session(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.now()
    video = models.Video(
        filename=f"Live scan {now:%Y-%m-%d %H:%M}",
        path=f"{LIVE_PREFIX}{uuid.uuid4().hex}",
        user_id=user.id,
    )
    db.add(video)
    db.flush()
    job = models.Job(video_id=video.id, status="processing", progress=0)
    db.add(job)
    db.commit()
    _last_seen[video.id] = {}
    return {"video_id": video.id, "job_id": job.id}


@router.post("/sessions/{video_id}/frames", response_model=LiveFrameOut)
def send_frame(
    video_id: int,
    file: UploadFile,
    t: float = Form(0, ge=0, description="Detik sejak sesi dimulai (jam HP)"),
    seq: int = Form(0, ge=0, description="Nomor urut frame dari HP"),
    lat: float | None = Form(None, ge=-90, le=90),
    lng: float | None = Form(None, ge=-180, le=180),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    video, job = _get_live_session(db, video_id, user)
    if not job or job.status != "processing":
        raise HTTPException(409, "Sesi live sudah diakhiri")
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Frame harus gambar (JPEG)")
    jpeg = file.file.read(MAX_FRAME_KB * 1024 + 1)
    if len(jpeg) > MAX_FRAME_KB * 1024:
        raise HTTPException(413, f"Frame terlalu besar (maks {MAX_FRAME_KB} KB)")
    has_gps = lat is not None and lng is not None

    started = datetime.now()
    try:
        detections = detect_frame(jpeg)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from None
    inference_ms = int((datetime.now() - started).total_seconds() * 1000)

    out: list[LiveDetectionOut] = []
    with _session_lock(video_id):
        events = db.query(models.DamageEvent).filter_by(video_id=video_id).all()
        seen = _last_seen.setdefault(video_id, {})
        used: set[int] = set()  # satu event hanya dicocokkan sekali per frame
        saved_jpeg_for: list[models.DamageEvent] = []

        for d in sorted(detections, key=lambda d: -d.confidence):
            match = None
            for e in events:
                if e.id in used or e.damage_type != d.damage_type:
                    continue
                recent = t - seen.get(e.id, e.timestamp_sec) <= LIVE_MERGE_SEC
                near = (
                    has_gps
                    and e.latitude is not None
                    and e.longitude is not None
                    and distance_m(lat, lng, e.latitude, e.longitude) <= LIVE_MERGE_METERS
                )
                if recent or near:
                    match = e
                    break

            if match is None:
                match = models.DamageEvent(
                    video_id=video_id,
                    track_id=len(events) + 1,
                    damage_type=d.damage_type,
                    confidence=-1,
                    timestamp_sec=round(t, 3),
                    evidence_path="",
                )
                db.add(match)
                events.append(match)
                is_new = True
            else:
                is_new = False

            if d.confidence > match.confidence:  # frame lebih jelas -> jadi evidence baru
                match.confidence = d.confidence
                match.bbox = d.bbox
                match.frame = seq
                match.timestamp_sec = round(t, 3)
                if has_gps:
                    match.latitude, match.longitude = lat, lng
                saved_jpeg_for.append(match)
            elif has_gps and match.latitude is None:
                match.latitude, match.longitude = lat, lng

            db.flush()  # isi match.id untuk event baru
            used.add(match.id)
            seen[match.id] = t
            out.append(LiveDetectionOut(
                damage_type=d.damage_type, confidence=d.confidence, bbox=d.bbox,
                event_id=match.id, is_new=is_new,
            ))

        for e in saved_jpeg_for:
            old = e.evidence_path
            e.evidence_path = f"evidence/live{video_id}_e{e.id}_f{seq}.jpg"
            (STORAGE_DIR / e.evidence_path).write_bytes(jpeg)
            if old and old != e.evidence_path:
                (STORAGE_DIR / old).unlink(missing_ok=True)

        db.commit()
        total = len(events)

    return {"detections": out, "events_total": total, "inference_ms": inference_ms}


@router.post("/sessions/{video_id}/end", response_model=LiveEndOut)
def end_session(
    video_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    video, job = _get_live_session(db, video_id, user)
    if job and job.status == "processing":
        job.status, job.progress = "done", 100
        db.commit()
    _last_seen.pop(video_id, None)
    with _locks_guard:
        _session_locks.pop(video_id, None)
    total = db.query(models.DamageEvent).filter_by(video_id=video_id).count()
    return {"video_id": video.id, "events_total": total}
