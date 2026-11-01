from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import ensure_video_access, get_current_user, require_admin
from ..serializers import event_out

router = APIRouter(prefix="/events", tags=["events"])

USER_EDITABLE = {"latitude", "longitude"}  # user biasa hanya boleh mengisi lokasi


def _get_or_404(db: Session, event_id: int) -> models.DamageEvent:
    e = db.get(models.DamageEvent, event_id)
    if not e:
        raise HTTPException(404, "Damage event tidak ditemukan")
    return e


@router.post("", response_model=schemas.EventOut, status_code=201)
def create_event(
    data: schemas.EventCreate,
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Event normalnya dibuat otomatis oleh inference. Endpoint ini untuk admin (testing/manual)."""
    if not db.get(models.Video, data.video_id):
        raise HTTPException(404, "Video tidak ditemukan")
    e = models.DamageEvent(**data.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return event_out(e)


@router.get("", response_model=list[schemas.EventOut])
def list_events(
    video_id: int | None = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User: event dari video miliknya. Admin: semua event."""
    q = db.query(models.DamageEvent)
    if user.role != "admin":
        q = q.join(models.Video, models.Video.id == models.DamageEvent.video_id).filter(
            models.Video.user_id == user.id
        )
    if video_id is not None:
        q = q.filter(models.DamageEvent.video_id == video_id)
    return [event_out(e) for e in q.order_by(models.DamageEvent.id).all()]


@router.get("/{event_id}", response_model=schemas.EventOut)
def get_event(
    event_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    e = _get_or_404(db, event_id)
    ensure_video_access(user, e.video)
    return event_out(e)


@router.patch("/{event_id}", response_model=schemas.EventOut)
def update_event(
    event_id: int,
    data: schemas.EventUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User pemilik: isi lokasi (latitude/longitude). Admin: lokasi + koreksi tipe/confidence."""
    e = _get_or_404(db, event_id)
    ensure_video_access(user, e.video)
    changes = data.model_dump(exclude_unset=True)

    if user.role != "admin":
        if set(changes) - USER_EDITABLE:
            raise HTTPException(403, "User hanya boleh mengubah latitude dan longitude")
        report = db.query(models.Report).filter_by(event_id=event_id).first()
        if report and report.status != "New":
            raise HTTPException(409, "Report sudah diproses admin, lokasi tidak bisa diubah user")

    for k, v in changes.items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return event_out(e)


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    e = _get_or_404(db, event_id)
    ensure_video_access(user, e.video)
    if db.query(models.Report).filter_by(event_id=event_id).first():
        raise HTTPException(409, "Event sudah punya report, hapus report-nya dulu")
    db.delete(e)
    db.commit()
