from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/events", tags=["events"])


def _out(e: models.DamageEvent) -> schemas.EventOut:
    item = schemas.EventOut.model_validate(e)
    item.evidence_url = f"/files/{e.evidence_path}" if e.evidence_path else None
    return item


def _get_or_404(db: Session, event_id: int) -> models.DamageEvent:
    e = db.get(models.DamageEvent, event_id)
    if not e:
        raise HTTPException(404, "Damage event tidak ditemukan")
    return e


@router.post("", response_model=schemas.EventOut, status_code=201)
def create_event(data: schemas.EventCreate, db: Session = Depends(get_db)):
    """Event normalnya dibuat otomatis oleh inference. Endpoint ini untuk testing/manual."""
    if not db.get(models.Video, data.video_id):
        raise HTTPException(404, "Video tidak ditemukan")
    e = models.DamageEvent(**data.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return _out(e)


@router.get("", response_model=list[schemas.EventOut])
def list_events(video_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(models.DamageEvent)
    if video_id is not None:
        q = q.filter_by(video_id=video_id)
    return [_out(e) for e in q.order_by(models.DamageEvent.id).all()]


@router.get("/{event_id}", response_model=schemas.EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)):
    return _out(_get_or_404(db, event_id))


@router.patch("/{event_id}", response_model=schemas.EventOut)
def update_event(event_id: int, data: schemas.EventUpdate, db: Session = Depends(get_db)):
    """Dipakai user untuk mengisi lokasi (latitude/longitude), atau admin untuk koreksi tipe."""
    e = _get_or_404(db, event_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return _out(e)


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    e = _get_or_404(db, event_id)
    if db.query(models.Report).filter_by(event_id=event_id).first():
        raise HTTPException(409, "Event sudah punya report, hapus report-nya dulu")
    db.delete(e)
    db.commit()
