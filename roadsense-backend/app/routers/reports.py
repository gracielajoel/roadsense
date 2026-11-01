import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import MAX_PHOTO_MB, STORAGE_DIR
from ..db import get_db
from ..deps import get_current_user, require_admin
from ..serializers import report_out

router = APIRouter(prefix="/reports", tags=["reports"])

# Alur status yang diizinkan (sesuai proposal: New -> Verified -> In Progress -> Completed)
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "New": {"Verified", "Rejected"},
    "Verified": {"In Progress"},
    "In Progress": {"Completed"},
    "Rejected": set(),
    "Completed": set(),
}
PHOTO_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def _get_accessible(db: Session, report_id: int, user: models.User) -> models.Report:
    """Admin boleh semua report; user hanya report miliknya."""
    r = db.get(models.Report, report_id)
    if not r:
        raise HTTPException(404, "Report tidak ditemukan")
    if user.role != "admin" and r.user_id != user.id:
        raise HTTPException(403, "Report ini bukan milik kamu")
    return r


@router.post("", response_model=schemas.ReportOut, status_code=201)
def create_report(
    data: schemas.ReportCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User mengirim report dari Damage Event miliknya (status awal: New)."""
    if user.role != "user":
        raise HTTPException(403, "Hanya user (bukan admin) yang bisa membuat report")
    event = db.get(models.DamageEvent, data.event_id)
    if not event:
        raise HTTPException(404, "Damage event tidak ditemukan")
    if event.video.user_id != user.id:
        raise HTTPException(403, "Event ini bukan dari video milik kamu")
    if db.query(models.Report).filter_by(event_id=data.event_id).first():
        raise HTTPException(409, "Event ini sudah pernah dilaporkan")
    if event.latitude is None or event.longitude is None:
        raise HTTPException(400, "Lokasi event belum diisi. Tentukan lokasi di peta dulu")

    r = models.Report(event_id=event.id, user_id=user.id, status="New")
    r.status_logs.append(
        models.ReportStatusLog(from_status=None, to_status="New", changed_by=user.id)
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return report_out(r)


@router.get("", response_model=list[schemas.ReportOut])
def list_reports(
    status: schemas.ReportStatus | None = None,
    user_id: int | None = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User: report miliknya. Admin: semua report (filter ?status= dan ?user_id=)."""
    q = db.query(models.Report)
    if user.role != "admin":
        q = q.filter_by(user_id=user.id)
    elif user_id is not None:
        q = q.filter_by(user_id=user_id)
    if status:
        q = q.filter_by(status=status)
    return [report_out(r) for r in q.order_by(models.Report.id).all()]


@router.get("/{report_id}", response_model=schemas.ReportOut)
def get_report(
    report_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return report_out(_get_accessible(db, report_id, user))


@router.get("/{report_id}/history", response_model=list[schemas.StatusLogOut])
def get_report_history(
    report_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Riwayat status report, urut dari yang paling awal."""
    return _get_accessible(db, report_id, user).status_logs


@router.patch("/{report_id}", response_model=schemas.ReportOut)
def update_report(
    report_id: int,
    data: schemas.ReportUpdate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin mengganti status. Pelaku perubahan = admin yang login, tercatat di riwayat."""
    r = db.get(models.Report, report_id)
    if not r:
        raise HTTPException(404, "Report tidak ditemukan")

    new_status = data.status
    if new_status is not None and new_status != r.status:
        allowed = ALLOWED_TRANSITIONS[r.status]
        if new_status not in allowed:
            hint = ", ".join(sorted(allowed)) or "tidak ada (status akhir)"
            raise HTTPException(
                409, f"Status {r.status} tidak bisa langsung ke {new_status}. Yang diizinkan: {hint}"
            )
        if new_status == "Completed" and not r.after_photo_path:
            raise HTTPException(400, "Unggah foto after-repair dulu sebelum status Completed")

        r.status_logs.append(
            models.ReportStatusLog(
                from_status=r.status, to_status=new_status, changed_by=admin.id, note=data.note
            )
        )
        if r.verified_by is None:  # admin pertama yang memproses = pemverifikasi
            r.verified_by = admin.id
        r.status = new_status

    db.commit()
    db.refresh(r)
    return report_out(r)


@router.post("/{report_id}/after-photo", response_model=schemas.ReportOut)
def upload_after_photo(
    report_id: int,
    file: UploadFile,
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin mengunggah foto setelah perbaikan (jpg/png/webp). Wajib sebelum status Completed."""
    r = db.get(models.Report, report_id)
    if not r:
        raise HTTPException(404, "Report tidak ditemukan")
    if r.status not in ("In Progress", "Completed"):
        raise HTTPException(409, "Foto after-repair hanya bisa diunggah saat status In Progress atau Completed")
    ext = PHOTO_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(400, "File harus gambar JPG, PNG, atau WEBP")

    limit = MAX_PHOTO_MB * 1024 * 1024
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, f"Ukuran foto maksimal {MAX_PHOTO_MB} MB")
    if not data:
        raise HTTPException(400, "File kosong")

    rel = f"after/report{r.id}_{uuid.uuid4().hex[:8]}{ext}"
    (STORAGE_DIR / rel).write_bytes(data)
    if r.after_photo_path:  # ganti foto lama
        (STORAGE_DIR / r.after_photo_path).unlink(missing_ok=True)
    r.after_photo_path = rel
    db.commit()
    db.refresh(r)
    return report_out(r)


@router.delete("/{report_id}", status_code=204)
def delete_report(
    report_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Admin: hapus report apa pun. User: hanya report miliknya yang masih berstatus New."""
    r = _get_accessible(db, report_id, user)
    if user.role != "admin" and r.status != "New":
        raise HTTPException(403, "Report yang sudah diproses admin tidak bisa dihapus user")
    if r.after_photo_path:
        (STORAGE_DIR / r.after_photo_path).unlink(missing_ok=True)
    db.delete(r)  # riwayat status ikut terhapus (cascade)
    db.commit()
