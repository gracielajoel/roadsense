from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(data: schemas.UserRegister, db: Session = Depends(get_db)):
    """Pendaftaran publik. Role selalu 'user'; akun admin dibuat via seed atau oleh admin."""
    email = data.email.strip().lower()
    if db.query(models.User).filter(func.lower(models.User.email) == email).first():
        raise HTTPException(409, "Email sudah terdaftar")
    user = models.User(
        name=data.name, email=email, password_hash=hash_password(data.password), role="user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Form-encoded: username = email, password = password."""
    email = form.username.strip().lower()
    user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            401, "Email atau password salah", headers={"WWW-Authenticate": "Bearer"}
        )
    return {"access_token": create_access_token(user.id), "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user
