import re
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import ensure_video_access, get_current_user
from ..serializers import event_out, video_out
from ..config import STORAGE_DIR
from ..db import SessionLocal, get_db
from ..services.inference import process_video

router = APIRouter(tags=["videos"])


def run_job(job_id: int):
    """Jalan di background. Pakai session sendiri (bukan dari request)."""
    db = SessionLocal()
    try:
        job = db.get(models.Job, job_id)
        video = db.get(models.Video, job.video_id)
        job.status = "processing"
        db.commit()

        def on_progress(p: int):
            job.progress = p
            db.commit()

        events = process_video(
            str(STORAGE_DIR / video.path), STORAGE_DIR / "evidence", on_progress
        )
        for e in events:
            db.add(models.DamageEvent(
                video_id=video.id,
                track_id=e.track_id,
                damage_type=e.damage_type,
                confidence=e.confidence,
                timestamp_sec=e.timestamp_sec,
                frame=e.frame,
                bbox=e.bbox,
                evidence_path=str(Path(e.evidence_image_path).relative_to(STORAGE_DIR))
                if Path(e.evidence_image_path).is_relative_to(STORAGE_DIR)
                else e.evidence_image_path,
            ))
        job.status, job.progress = "done", 100
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        job = db.get(models.Job, job_id)
        job.status, job.error = "failed", str(exc)[:500]
        db.commit()
    finally:
        db.close()


def _get_video_or_404(db: Session, video_id: int) -> models.Video:
    video = db.get(models.Video, video_id)
    if not video:
        raise HTTPException(404, "Video tidak ditemukan")
    return video


@router.post("/videos", response_model=schemas.VideoUploadOut)
def upload_video(
    file: UploadFile,
    bg: BackgroundTasks,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not (file.content_type or "").startswith("video/"):
        raise HTTPException(400, "File harus video")
    original = Path(file.filename or "video.mp4").name
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", original)[:100]
    rel = f"videos/{uuid.uuid4().hex}_{safe}"
    with open(STORAGE_DIR / rel, "wb") as f:
        shutil.copyfileobj(file.file, f)

    video = models.Video(filename=original, path=rel, user_id=user.id)
    db.add(video)
    db.flush()
    job = models.Job(video_id=video.id)
    db.add(job)
    db.commit()
    bg.add_task(run_job, job.id)
    return {"video_id": video.id, "job_id": job.id}


@router.get("/videos", response_model=list[schemas.VideoOut])
def list_videos(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """User: video miliknya. Admin: semua video."""
    q = db.query(models.Video)
    if user.role != "admin":
        q = q.filter_by(user_id=user.id)
    return [video_out(v) for v in q.order_by(models.Video.id).all()]


@router.get("/videos/{video_id}", response_model=schemas.VideoOut)
def get_video(
    video_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    video = _get_video_or_404(db, video_id)
    ensure_video_access(user, video)
    return video_out(video)


@router.get("/videos/{video_id}/events", response_model=list[schemas.EventOut])
def list_video_events(
    video_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    video = _get_video_or_404(db, video_id)
    ensure_video_access(user, video)
    events = (
        db.query(models.DamageEvent)
        .filter_by(video_id=video_id)
        .order_by(models.DamageEvent.timestamp_sec)
        .all()
    )
    return [event_out(e) for e in events]


@router.get("/jobs", response_model=list[schemas.JobOut])
def list_jobs(
    video_id: int | None = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Job)
    if user.role != "admin":
        q = q.join(models.Video, models.Video.id == models.Job.video_id).filter(
            models.Video.user_id == user.id
        )
    if video_id is not None:
        q = q.filter(models.Job.video_id == video_id)
    return q.order_by(models.Job.id).all()


@router.get("/jobs/{job_id}", response_model=schemas.JobOut)
def get_job(
    job_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    job = db.get(models.Job, job_id)
    if not job:
        raise HTTPException(404, "Job tidak ditemukan")
    ensure_video_access(user, _get_video_or_404(db, job.video_id))
    return job


@router.delete("/videos/{video_id}", status_code=204)
def delete_video(
    video_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Hapus video + job + event + file-nya. Ditolak kalau ada event yang sudah jadi report."""
    video = _get_video_or_404(db, video_id)
    ensure_video_access(user, video)

    event_ids = [e.id for e in db.query(models.DamageEvent.id).filter_by(video_id=video_id)]
    if event_ids and db.query(models.Report).filter(models.Report.event_id.in_(event_ids)).first():
        raise HTTPException(409, "Ada event dari video ini yang sudah jadi report, hapus report-nya dulu")

    for e in db.query(models.DamageEvent).filter_by(video_id=video_id):
        if e.evidence_path:
            (STORAGE_DIR / e.evidence_path).unlink(missing_ok=True)
        db.delete(e)
    db.query(models.Job).filter_by(video_id=video_id).delete()
    (STORAGE_DIR / video.path).unlink(missing_ok=True)
    db.delete(video)
    db.commit()
