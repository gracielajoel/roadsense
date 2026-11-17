from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user, require_admin
from ..security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


def _get_or_404(db: Session, user_id: int) -> models.User:
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(404, "User tidak ditemukan")
    return user


def _email_taken(db: Session, email: str, except_id: int | None = None) -> bool:
    q = db.query(models.User).filter(func.lower(models.User.email) == email)
    if except_id is not None:
        q = q.filter(models.User.id != except_id)
    return q.first() is not None


@router.post("", response_model=schemas.UserOut, status_code=201)
def create_user(
    data: schemas.UserCreate,
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin membuat akun (termasuk akun admin lain)."""
    email = data.email.strip().lower()
    if _email_taken(db, email):
        raise HTTPException(409, "Email sudah terdaftar")
    user = models.User(
        name=data.name, email=email, password_hash=hash_password(data.password), role=data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[schemas.UserOut])
def list_users(
    role: schemas.Role | None = None,
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(models.User)
    if role:
        q = q.filter_by(role=role)
    return q.order_by(models.User.id).all()


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: int,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current.role != "admin" and current.id != user_id:
        raise HTTPException(403, "Tidak boleh melihat user lain")
    return _get_or_404(db, user_id)


@router.patch("/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    data: schemas.UserUpdate,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: semua user. User biasa: hanya akun sendiri, dan tidak boleh mengubah role."""
    if current.role != "admin" and current.id != user_id:
        raise HTTPException(403, "Tidak boleh mengubah user lain")
    user = _get_or_404(db, user_id)
    changes = data.model_dump(exclude_unset=True)

    if "role" in changes and changes["role"] != user.role:
        if current.role != "admin":
            raise HTTPException(403, "Hanya admin yang boleh mengubah role")
        if current.id == user.id:
            raise HTTPException(400, "Tidak bisa mengubah role akun sendiri")
    if "email" in changes:
        changes["email"] = changes["email"].strip().lower()
        if _email_taken(db, changes["email"], except_id=user.id):
            raise HTTPException(409, "Email sudah dipakai user lain")
    if "password" in changes:
        user.password_hash = hash_password(changes.pop("password"))
    for k, v in changes.items():
        setattr(user, k, v)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = _get_or_404(db, user_id)
    if user.id == admin.id:
        raise HTTPException(400, "Tidak bisa menghapus akun sendiri")
    used = (
        db.query(models.Report)
        .filter(or_(models.Report.user_id == user_id, models.Report.verified_by == user_id))
        .count()
    )
    used += db.query(models.ReportStatusLog).filter_by(changed_by=user_id).count()
    used += db.query(models.Video).filter_by(user_id=user_id).count()
    if used:
        raise HTTPException(409, "User masih terkait video/report/riwayat status, tidak bisa dihapus")
    db.delete(user)
    db.commit()
