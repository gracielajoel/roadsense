import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401  (daftarkan tabel)
from .config import CORS_ORIGINS, DEFAULT_SECRET_KEY, SECRET_KEY, STORAGE_DIR
from .db import Base, engine
from .routers import auth, events, reports, stats, users, videos

# Prototype: buat tabel otomatis. Nanti ganti ke Alembic.
Base.metadata.create_all(bind=engine)

if SECRET_KEY == DEFAULT_SECRET_KEY:
    logging.getLogger("uvicorn.error").warning(
        "SECRET_KEY masih default. Isi SECRET_KEY di .env sebelum deploy ke VPS."
    )

app = FastAPI(title="RoadSense API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, videos.router, users.router, events.router, reports.router, stats.router):
    app.include_router(r, prefix="/api/v1")

# Evidence, video, after-photo diakses via /files/<path>
app.mount("/files", StaticFiles(directory=STORAGE_DIR), name="files")


@app.get("/health")
def health():
    return {"status": "ok"}
