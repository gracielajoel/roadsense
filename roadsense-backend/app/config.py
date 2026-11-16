import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # baca file .env di folder tempat uvicorn dijalankan

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./roadsense.db")
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "./storage"))
# --- Model deteksi (dipakai inference.py asli) ---
MODEL_PATH = Path(os.getenv("MODEL_PATH", "./weights/model.pt"))
MODEL_IMGSZ = int(os.getenv("MODEL_IMGSZ", "512"))
MODEL_CONF = float(os.getenv("MODEL_CONF", "0.25"))
TRACKER_CONFIG = os.getenv("TRACKER_CONFIG", "botsort.yaml")      # atau path ke YAML BoT-SORT kustom
VID_STRIDE = max(1, int(os.getenv("VID_STRIDE", "1")))           # 1 = proses semua frame; 2 = tiap 2 frame, dst
MIN_TRACK_FRAMES = max(1, int(os.getenv("MIN_TRACK_FRAMES", "3")))  # track lebih pendek dibuang (anti false detection)
USE_DUMMY_INFERENCE = os.getenv("USE_DUMMY_INFERENCE", "false").lower() in ("1", "true", "yes")

# --- Live scan (HP kirim frame kamera, inference di server) ---
LIVE_CONF = float(os.getenv("LIVE_CONF", "0.35"))                  # lebih ketat dari video: tidak ada tracker penyaring
LIVE_MERGE_METERS = float(os.getenv("LIVE_MERGE_METERS", "15"))    # deteksi sejenis sedekat ini = kerusakan yang sama
LIVE_MERGE_SEC = float(os.getenv("LIVE_MERGE_SEC", "4"))           # cadangan kalau GPS tidak ada
MAX_FRAME_KB = int(os.getenv("MAX_FRAME_KB", "1500"))              # batas ukuran satu frame JPEG

# --- Login / token ---
DEFAULT_SECRET_KEY = "dev-only-secret-change-me"
SECRET_KEY = os.getenv("SECRET_KEY", DEFAULT_SECRET_KEY)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 jam
MAX_PHOTO_MB = int(os.getenv("MAX_PHOTO_MB", "10"))  # batas ukuran foto after-repair

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:7860"
).split(",")

for sub in ("videos", "evidence", "after"):
    (STORAGE_DIR / sub).mkdir(parents=True, exist_ok=True)
