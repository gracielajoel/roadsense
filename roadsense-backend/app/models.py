from datetime import datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('user', 'admin')", name="ck_users_role"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(10), default="user")  # user | admin
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Report yang DIBUAT user ini (1 user -> banyak report)
    reports_created: Mapped[list["Report"]] = relationship(
        back_populates="creator", foreign_keys="Report.user_id"
    )
    # Report yang DIVERIFIKASI admin ini (1 admin -> banyak report)
    reports_verified: Mapped[list["Report"]] = relationship(
        back_populates="verifier", foreign_keys="Report.verified_by"
    )


class Video(Base):
    __tablename__ = "videos"
    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    path: Mapped[str] = mapped_column(String(500))  # relatif terhadap STORAGE_DIR
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    events: Mapped[list["DamageEvent"]] = relationship(back_populates="video")


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    video_id: Mapped[int] = mapped_column(ForeignKey("videos.id"))
    status: Mapped[str] = mapped_column(String(20), default="queued")  # queued|processing|done|failed
    progress: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)


class DamageEvent(Base):
    __tablename__ = "damage_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    video_id: Mapped[int] = mapped_column(ForeignKey("videos.id"))
    track_id: Mapped[int] = mapped_column(Integer)
    damage_type: Mapped[str] = mapped_column(String(10))  # D00 | D10 | D20 | D40
    confidence: Mapped[float] = mapped_column(Float)
    timestamp_sec: Mapped[float] = mapped_column(Float)
    evidence_path: Mapped[str] = mapped_column(String(500))
    frame: Mapped[int | None] = mapped_column(Integer, nullable=True)  # nomor frame di video
    bbox: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)  # [x, y, w, h] relatif 0-1
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    video: Mapped[Video] = relationship(back_populates="events")


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("damage_events.id"), unique=True)
    # Pembuat report: wajib, tepat 1 user
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    # Admin pemverifikasi: kosong selama status masih New, terisi saat diverifikasi/ditolak
    verified_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="New")  # New|Verified|In Progress|Completed|Rejected
    after_photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    creator: Mapped[User] = relationship(
        back_populates="reports_created", foreign_keys=[user_id]
    )
    verifier: Mapped[User | None] = relationship(
        back_populates="reports_verified", foreign_keys=[verified_by]
    )
    # Riwayat perubahan status; ikut terhapus kalau report dihapus
    status_logs: Mapped[list["ReportStatusLog"]] = relationship(
        back_populates="report",
        cascade="all, delete-orphan",
        order_by="ReportStatusLog.id",
    )


class ReportStatusLog(Base):
    """Satu baris = satu kali perubahan status report (append-only, jangan di-edit)."""
    __tablename__ = "report_status_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.id"), index=True)
    from_status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # NULL = report baru dibuat
    to_status: Mapped[str] = mapped_column(String(20))
    changed_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    report: Mapped[Report] = relationship(back_populates="status_logs")
    changer: Mapped[User] = relationship(foreign_keys=[changed_by])