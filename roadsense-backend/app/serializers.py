"""Mengisi field URL pada response (evidence, video, foto after-repair)."""
from . import models, schemas


def video_out(v: models.Video) -> schemas.VideoOut:
    out = schemas.VideoOut.model_validate(v)
    out.is_live = v.path.startswith("live/")
    out.url = None if out.is_live else f"/files/{v.path}"
    return out


def event_out(e: models.DamageEvent) -> schemas.EventOut:
    out = schemas.EventOut.model_validate(e)
    out.evidence_url = f"/files/{e.evidence_path}" if e.evidence_path else None
    return out


def report_out(r: models.Report) -> schemas.ReportOut:
    out = schemas.ReportOut.model_validate(r)
    out.after_photo_url = f"/files/{r.after_photo_path}" if r.after_photo_path else None
    if r.event is not None:
        out.event = event_out(r.event)
    return out
