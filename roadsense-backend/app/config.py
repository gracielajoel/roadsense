import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # baca file .env di folder tempat uvicorn dijalankan

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./roadsense.db")
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "./storage"))
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:7860"
).split(",")

for sub in ("videos", "evidence", "after"):
    (STORAGE_DIR / sub).mkdir(parents=True, exist_ok=True)
