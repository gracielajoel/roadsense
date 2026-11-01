"""Dependency FastAPI untuk autentikasi & otorisasi."""
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import models
from .db import get_db
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

_UNAUTHORIZED = HTTPException(
    status_code=401,
    detail="Token tidak valid atau kedaluwarsa, silakan login ulang",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    try:
        user_id = int(decode_access_token(token)["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise _UNAUTHORIZED from None
    user = db.get(models.User, user_id)  # role selalu dibaca dari DB, bukan dari token
    if not user:
        raise _UNAUTHORIZED
    return user


def require_admin(user: models.User = Depends(get_current_user)) -> models.User:
    if user.role != "admin":
        raise HTTPException(403, "Hanya admin yang boleh melakukan ini")
    return user


def ensure_video_access(user: models.User, video: models.Video) -> None:
    """Admin boleh semua; user hanya video miliknya."""
    if user.role != "admin" and video.user_id != user.id:
        raise HTTPException(403, "Video ini bukan milik kamu")
