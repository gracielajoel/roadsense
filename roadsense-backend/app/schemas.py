from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Role = Literal["user", "admin"]
DamageType = Literal["D00", "D10", "D20", "D40"]
ReportStatus = Literal["New", "Verified", "In Progress", "Completed", "Rejected"]
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


# ---------- User & Auth ----------
class UserRegister(BaseModel):
    """Pendaftaran publik: role selalu 'user'."""
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(pattern=EMAIL_PATTERN, max_length=255)
    password: str = Field(min_length=6)


class UserCreate(BaseModel):
    """Dibuat oleh admin: boleh menentukan role."""
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(pattern=EMAIL_PATTERN, max_length=255)
    password: str = Field(min_length=6)
    role: Role = "user"


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = Field(default=None, pattern=EMAIL_PATTERN, max_length=255)
    password: str | None = Field(default=None, min_length=6)
    role: Role | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: str
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Video & Job ----------
class VideoUploadOut(BaseModel):
    video_id: int
    job_id: int


class VideoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    filename: str
    path: str
    url: str | None = None  # diisi di router: /files/<path>
    user_id: int | None = None
    created_at: datetime


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    video_id: int
    status: str
    progress: int
    error: str | None = None


# ---------- Damage Event ----------
def _check_bbox(v):
    """bbox = [x, y, lebar, tinggi], tiap nilai 0-1 (relatif terhadap ukuran frame)."""
    if v is not None and not all(0 <= n <= 1 for n in v):
        raise ValueError("Semua nilai bbox harus di antara 0 dan 1")
    return v


class EventCreate(BaseModel):
    video_id: int
    track_id: int
    damage_type: DamageType
    confidence: float = Field(ge=0, le=1)
    timestamp_sec: float = Field(ge=0)
    evidence_path: str = ""
    frame: int | None = Field(default=None, ge=0)
    bbox: list[float] | None = Field(default=None, min_length=4, max_length=4)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    _bbox_ok = field_validator("bbox")(_check_bbox)


class EventUpdate(BaseModel):
    damage_type: DamageType | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    timestamp_sec: float | None = Field(default=None, ge=0)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    video_id: int
    track_id: int
    damage_type: str
    confidence: float
    timestamp_sec: float
    evidence_url: str | None = None  # diisi di router
    frame: int | None = None
    bbox: list[float] | None = None
    latitude: float | None = None
    longitude: float | None = None


# ---------- Report ----------
class ReportCreate(BaseModel):
    event_id: int  # pembuat diambil dari token login


class ReportUpdate(BaseModel):
    status: ReportStatus | None = None
    note: str | None = Field(default=None, max_length=500)  # catatan, masuk ke riwayat
    # changed_by tidak ada lagi: otomatis admin yang sedang login.
    # Foto after-repair diunggah lewat POST /reports/{id}/after-photo.


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    user_id: int
    verified_by: int | None = None
    status: str
    after_photo_path: str | None = None
    after_photo_url: str | None = None  # diisi di router
    created_at: datetime
    event: EventOut | None = None  # detail kerusakan, evidence, dan lokasi


class StatusLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    report_id: int
    from_status: str | None = None
    to_status: str
    changed_by: int
    note: str | None = None
    changed_at: datetime


# ---------- Dashboard ----------
class StatsOut(BaseModel):
    total_videos: int
    total_events: int
    total_reports: int
    by_status: dict[str, int]
    by_damage_type: dict[str, int]
    completion_rate: float | None = None  # Completed / total report (None kalau belum ada report)


class MapPointOut(BaseModel):
    report_id: int
    status: str
    damage_type: str
    confidence: float
    latitude: float
    longitude: float
    evidence_url: str | None = None
    created_at: datetime
