import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt

from .config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY


# ---------- password ----------
def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"pbkdf2${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt_hex, hash_hex = stored.split("$")
    except ValueError:
        return False
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 200_000)
    return hmac.compare_digest(dk.hex(), hash_hex)


# ---------- token (JWT) ----------
def create_access_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    """Raise jwt.InvalidTokenError kalau token salah atau kedaluwarsa."""
    return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
