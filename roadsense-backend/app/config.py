import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # baca file .env di folder tempat uvicorn dijalankan

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./roadsense.db")
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "./storage"))
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:7860"
).split(",")

# Inference (lihat services/inference.py)
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(STORAGE_DIR / "weights" / "best.pt")))
INFERENCE_CONF = float(os.getenv("INFERENCE_CONF", "0.25"))        # confidence minimum
INFERENCE_VID_STRIDE = int(os.getenv("INFERENCE_VID_STRIDE", "2"))  # proses tiap N frame (CPU lebih cepat)
INFERENCE_MIN_HITS = int(os.getenv("INFERENCE_MIN_HITS", "3"))      # track harus muncul >= N kali

for sub in ("videos", "evidence", "after", "weights"):
    (STORAGE_DIR / sub).mkdir(parents=True, exist_ok=True)
