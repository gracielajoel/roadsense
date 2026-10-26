import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
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
                # as_posix: di Windows str(Path) pakai backslash, URL jadi rusak
                evidence_path=Path(e.evidence_image_path).relative_to(STORAGE_DIR).as_posix()
                if Path(e.evidence_image_path).is_relative_to(STORAGE_DIR)
                else e.evidence_image_path,
                frame=e.frame,
                bbox=e.bbox,
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


@router.post("/videos", response_model=schemas.VideoUploadOut)
def upload_video(file: UploadFile, bg: BackgroundTasks, db: Session = Depends(get_db)):
    if not (file.content_type or "").startswith("video/"):
        raise HTTPException(400, "File harus video")
    rel = f"videos/{uuid.uuid4().hex}_{file.filename}"
    with open(STORAGE_DIR / rel, "wb") as f:
        shutil.copyfileobj(file.file, f)

    video = models.Video(filename=file.filename, path=rel)
    db.add(video)
    db.flush()
    job = models.Job(video_id=video.id)
    db.add(job)
    db.commit()
    bg.add_task(run_job, job.id)
    return {"video_id": video.id, "job_id": job.id}


@router.get("/jobs/{job_id}", response_model=schemas.JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(models.Job, job_id)
    if not job:
        raise HTTPException(404, "Job tidak ditemukan")
    return job


@router.get("/videos/{video_id}/events", response_model=list[schemas.EventOut])
def list_events(video_id: int, db: Session = Depends(get_db)):
    events = (
        db.query(models.DamageEvent)
        .filter_by(video_id=video_id)
        .order_by(models.DamageEvent.timestamp_sec)
        .all()
    )
    out = []
    for e in events:
        item = schemas.EventOut.model_validate(e)
        item.evidence_url = f"/files/{e.evidence_path}"
        out.append(item)
    return out


@router.get("/videos", response_model=list[schemas.VideoOut])
def list_videos(db: Session = Depends(get_db)):
    return db.query(models.Video).order_by(models.Video.id).all()


@router.get("/videos/{video_id}", response_model=schemas.VideoOut)
def get_video(video_id: int, db: Session = Depends(get_db)):
    video = db.get(models.Video, video_id)
    if not video:
        raise HTTPException(404, "Video tidak ditemukan")
    return video


@router.get("/jobs", response_model=list[schemas.JobOut])
def list_jobs(video_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Job)
    if video_id is not None:
        q = q.filter_by(video_id=video_id)
    return q.order_by(models.Job.id).all()


@router.delete("/videos/{video_id}", status_code=204)
def delete_video(video_id: int, db: Session = Depends(get_db)):
    """Hapus video + job + event + file-nya. Ditolak kalau ada event yang sudah jadi report."""
    video = db.get(models.Video, video_id)
    if not video:
        raise HTTPException(404, "Video tidak ditemukan")

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