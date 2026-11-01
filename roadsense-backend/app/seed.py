"""
Buat (atau pulihkan) akun admin.

    python -m app.seed EMAIL PASSWORD [NAMA]

Kalau email sudah ada: role-nya dijadikan admin dan password-nya diganti.
Cara ini juga untuk memperbaiki akun lama yang password_hash-nya 'dummy'.
"""
import sys

from sqlalchemy import func

from . import models
from .db import Base, SessionLocal, engine
from .security import hash_password


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit('Pemakaian: python -m app.seed EMAIL PASSWORD ["Nama Admin"]')
    email, password = sys.argv[1].strip().lower(), sys.argv[2]
    name = sys.argv[3] if len(sys.argv) > 3 else "Admin"
    if len(password) < 6:
        sys.exit("Password minimal 6 karakter")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
        if user:
            user.role, user.password_hash = "admin", hash_password(password)
            print(f"Akun {email} sudah ada -> dijadikan admin dan password diperbarui")
        else:
            db.add(models.User(name=name, email=email, password_hash=hash_password(password), role="admin"))
            print(f"Admin {email} dibuat")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
