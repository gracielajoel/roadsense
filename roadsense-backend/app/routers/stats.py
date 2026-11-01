from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])

STATUSES = ["New", "Verified", "In Progress", "Completed", "Rejected"]
DAMAGE_TYPES = ["D00", "D10", "D20", "D40"]


def _scope_reports(q, user: models.User):
    """Admin melihat semua report; user hanya miliknya."""
    return q if user.role == "admin" else q.filter(models.Report.user_id == user.id)


@router.get("", response_model=schemas.StatsOut)
def get_stats(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Ringkasan dashboard. Admin: seluruh sistem. User: data miliknya sendiri."""
    admin = user.role == "admin"

    videos_q = db.query(func.count(models.Video.id))
    events_q = db.query(func.count(models.DamageEvent.id))
    if not admin:
        videos_q = videos_q.filter(models.Video.user_id == user.id)
        events_q = events_q.join(
            models.Video, models.Video.id == models.DamageEvent.video_id
        ).filter(models.Video.user_id == user.id)

    by_status = {s: 0 for s in STATUSES}
    rows = _scope_reports(
        db.query(models.Report.status, func.count(models.Report.id)), user
    ).group_by(models.Report.status)
    for status, n in rows:
        by_status[status] = n

    by_type = {t: 0 for t in DAMAGE_TYPES}
    rows = _scope_reports(
        db.query(models.DamageEvent.damage_type, func.count(models.Report.id)).join(
            models.Report, models.Report.event_id == models.DamageEvent.id
        ),
        user,
    ).group_by(models.DamageEvent.damage_type)
    for dtype, n in rows:
        by_type[dtype] = n

    total_reports = sum(by_status.values())
    return {
        "total_videos": videos_q.scalar() or 0,
        "total_events": events_q.scalar() or 0,
        "total_reports": total_reports,
        "by_status": by_status,
        "by_damage_type": by_type,
        "completion_rate": round(by_status["Completed"] / total_reports, 4) if total_reports else None,
    }


@router.get("/map", response_model=list[schemas.MapPointOut])
def get_map_points(
    status: schemas.ReportStatus | None = None,
    damage_type: schemas.DamageType | None = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Titik persebaran kerusakan untuk peta (hanya report yang punya lokasi)."""
    q = (
        db.query(models.Report, models.DamageEvent)
        .join(models.DamageEvent, models.DamageEvent.id == models.Report.event_id)
        .filter(models.DamageEvent.latitude.isnot(None), models.DamageEvent.longitude.isnot(None))
    )
    q = _scope_reports(q, user)
    if status:
        q = q.filter(models.Report.status == status)
    if damage_type:
        q = q.filter(models.DamageEvent.damage_type == damage_type)

    return [
        {
            "report_id": r.id,
            "status": r.status,
            "damage_type": e.damage_type,
            "confidence": e.confidence,
            "latitude": e.latitude,
            "longitude": e.longitude,
            "evidence_url": f"/files/{e.evidence_path}" if e.evidence_path else None,
            "created_at": r.created_at,
        }
        for r, e in q.order_by(models.Report.id).all()
    ]
