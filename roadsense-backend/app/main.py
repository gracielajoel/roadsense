from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401  (daftarkan tabel)
from .config import CORS_ORIGINS, STORAGE_DIR
from .db import Base, engine
from .routers import events, reports, users, videos

# Prototype: buat tabel otomatis. Nanti ganti ke Alembic.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RoadSense API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (videos.router, users.router, events.router, reports.router):
    app.include_router(r, prefix="/api/v1")

# Evidence, video, after-photo diakses via /files/<path>
app.mount("/files", StaticFiles(directory=STORAGE_DIR), name="files")


@app.get("/health")
def health():
    return {"status": "ok"}