from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/reports", tags=["reports"])

# Alur status yang diizinkan (sesuai proposal: New -> Verified -> In Progress -> Completed)
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "New": {"Verified", "Rejected"},
    "Verified": {"In Progress"},
    "In Progress": {"Completed"},
    "Rejected": set(),
    "Completed": set(),
}


def _get_or_404(db: Session, report_id: int) -> models.Report:
    r = db.get(models.Report, report_id)
    if not r:
        raise HTTPException(404, "Report tidak ditemukan")
    return r


@router.post("", response_model=schemas.ReportOut, status_code=201)
def create_report(data: schemas.ReportCreate, db: Session = Depends(get_db)):
    if not db.get(models.DamageEvent, data.event_id):
        raise HTTPException(404, "Damage event tidak ditemukan")
    if db.query(models.Report).filter_by(event_id=data.event_id).first():
        raise HTTPException(409, "Event ini sudah pernah dilaporkan")

    creator = db.get(models.User, data.user_id)
    if not creator:
        raise HTTPException(404, "User tidak ditemukan")
    # Hapus 2 baris di bawah kalau admin juga boleh membuat report
    if creator.role != "user":
        raise HTTPException(403, "Hanya user (bukan admin) yang bisa membuat report")

    r = models.Report(event_id=data.event_id, user_id=data.user_id, status="New")
    # Catatan pertama di riwayat: report dibuat
    r.status_logs.append(
        models.ReportStatusLog(from_status=None, to_status="New", changed_by=creator.id)
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.get("", response_model=list[schemas.ReportOut])
def list_reports(
    status: schemas.ReportStatus | None = None,
    user_id: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Report)
    if status:
        q = q.filter_by(status=status)
    if user_id is not None:
        q = q.filter_by(user_id=user_id)
    return q.order_by(models.Report.id).all()


@router.get("/{report_id}", response_model=schemas.ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, report_id)


@router.get("/{report_id}/history", response_model=list[schemas.StatusLogOut])
def get_report_history(report_id: int, db: Session = Depends(get_db)):
    """Riwayat status report, urut dari yang paling awal."""
    r = _get_or_404(db, report_id)
    return r.status_logs


@router.patch("/{report_id}", response_model=schemas.ReportOut)
def update_report(report_id: int, data: schemas.ReportUpdate, db: Session = Depends(get_db)):
    """Dipakai admin: ganti status (tercatat di riwayat) dan/atau isi foto after-repair."""
    r = _get_or_404(db, report_id)
    changes = data.model_dump(exclude_unset=True)

    new_status = changes.get("status")
    if new_status is not None and new_status != r.status:
        # 1. siapa yang mengubah: wajib admin
        if changes.get("changed_by") is None:
            raise HTTPException(400, "changed_by (id admin) wajib diisi saat mengubah status")
        admin = db.get(models.User, changes["changed_by"])
        if not admin:
            raise HTTPException(404, "Admin tidak ditemukan")
        if admin.role != "admin":
            raise HTTPException(403, "changed_by harus user ber-role admin")

        # 2. transisi harus sesuai alur
        allowed = ALLOWED_TRANSITIONS[r.status]
        if new_status not in allowed:
            hint = ", ".join(sorted(allowed)) or "tidak ada (status akhir)"
            raise HTTPException(409, f"Status {r.status} tidak bisa langsung ke {new_status}. Yang diizinkan: {hint}")

        # 3. catat riwayat; admin pertama yang memproses menjadi verified_by
        r.status_logs.append(
            models.ReportStatusLog(
                from_status=r.status,
                to_status=new_status,
                changed_by=admin.id,
                note=changes.get("note"),
            )
        )
        if r.verified_by is None:
            r.verified_by = admin.id
        r.status = new_status

    if "after_photo_path" in changes:
        r.after_photo_path = changes["after_photo_path"]

    db.commit()
    db.refresh(r)
    return r


@router.delete("/{report_id}", status_code=204)
def delete_report(report_id: int, db: Session = Depends(get_db)):
    r = _get_or_404(db, report_id)
    db.delete(r)  # riwayat status ikut terhapus (cascade)
    db.commit()