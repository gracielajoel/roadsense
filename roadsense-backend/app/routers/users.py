from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


def _get_or_404(db: Session, user_id: int) -> models.User:
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(404, "User tidak ditemukan")
    return user


@router.post("", response_model=schemas.UserOut, status_code=201)
def create_user(data: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter_by(email=data.email).first():
        raise HTTPException(409, "Email sudah terdaftar")
    user = models.User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[schemas.UserOut])
def list_users(role: schemas.Role | None = None, db: Session = Depends(get_db)):
    q = db.query(models.User)
    if role:
        q = q.filter_by(role=role)
    return q.order_by(models.User.id).all()


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, user_id)


@router.patch("/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, data: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = _get_or_404(db, user_id)
    changes = data.model_dump(exclude_unset=True)

    if "email" in changes and changes["email"] != user.email:
        if db.query(models.User).filter_by(email=changes["email"]).first():
            raise HTTPException(409, "Email sudah dipakai user lain")
    if "password" in changes:
        user.password_hash = hash_password(changes.pop("password"))
    for k, v in changes.items():
        setattr(user, k, v)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = _get_or_404(db, user_id)
    used = (
        db.query(models.Report)
        .filter(or_(models.Report.user_id == user_id, models.Report.verified_by == user_id))
        .count()
    )
    used += db.query(models.ReportStatusLog).filter_by(changed_by=user_id).count()
    if used:
        raise HTTPException(409, "User masih terkait report/riwayat status, tidak bisa dihapus")
    db.delete(user)
    db.commit()