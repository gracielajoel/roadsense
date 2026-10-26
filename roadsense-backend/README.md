# RoadSense Backend

    python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    cp .env.example .env
    uvicorn app.main:app --reload

Buka http://localhost:8000/docs

Pakai Postgres: `docker compose up -d`, lalu set DATABASE_URL di environment.

## Model (sementara)

Inference pakai YOLO + BoT-SORT (`app/services/inference.py`). Weights tidak masuk git:
download `best.pt` dari Drive tim, taruh di `storage/weights/best.pt` (atau set `MODEL_PATH`).

Opsi lewat environment: `INFERENCE_CONF` (default 0.25), `INFERENCE_VID_STRIDE` (default 2, proses tiap N frame),
`INFERENCE_MIN_HITS` (default 3, track harus muncul minimal N kali).

Tabel `damage_events` punya kolom baru `frame` dan `bbox`. Karena belum pakai Alembic,
hapus `roadsense.db` (SQLite) atau drop tabel di Postgres supaya dibuat ulang.
