from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["user", "admin"]
DamageType = Literal["D00", "D10", "D20", "D40"]
ReportStatus = Literal["New", "Verified", "In Progress", "Completed", "Rejected"]


# ---------- Video & Job ----------
class VideoUploadOut(BaseModel):
    video_id: int
    job_id: int


class VideoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    filename: str
    path: str
    created_at: datetime


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    video_id: int
    status: str
    progress: int
    error: str | None = None


# ---------- User ----------
class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6)
    role: Role = "user"


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = Field(default=None, min_length=3, max_length=255)
    password: str | None = Field(default=None, min_length=6)
    role: Role | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: str
    created_at: datetime


# ---------- Damage Event ----------
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
    bbox: list[float] | None = None  # [x, y, w, h] relatif 0-1 terhadap frame
    latitude: float | None = None
    longitude: float | None = None


# ---------- Report ----------
class ReportCreate(BaseModel):
    event_id: int
    user_id: int  # sementara dari body; nanti diganti dari token login


class ReportUpdate(BaseModel):
    status: ReportStatus | None = None
    changed_by: int | None = None  # id admin yang mengubah; wajib kalau status diubah (nanti dari token login)
    note: str | None = Field(default=None, max_length=500)  # alasan/catatan, masuk ke riwayat
    after_photo_path: str | None = None


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    user_id: int
    verified_by: int | None = None
    status: str
    after_photo_path: str | None = None
    created_at: datetime


class StatusLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    report_id: int
    from_status: str | None = None
    to_status: str
    changed_by: int
    note: str | None = None
    changed_at: datetime