# RoadSense

Sistem deteksi kerusakan jalan dari video. Video jalan di-upload, model computer vision mendeteksi kerusakan (retak & lubang), lalu hasil deteksi bisa dijadikan laporan yang diverifikasi dan ditindaklanjuti admin.

## Stack

| Bagian   | Teknologi        | Folder                                       |
| -------- | ---------------- | -------------------------------------------- |
| Frontend | React + Vite     | [`roadsense-frontend/`](roadsense-frontend/) |
| Backend  | FastAPI          | [`roadsense-backend/`](roadsense-backend/)   |
| Database | PostgreSQL       | via `docker-compose.yml` di backend          |

## Struktur Repo

```
roadsense/
├── roadsense-backend/    # REST API, inference, database  → lihat README di dalamnya
├── roadsense-frontend/   # Web app                        → lihat README di dalamnya
└── README.md             # file ini
```

## Quick Start

Jalankan backend dulu, baru frontend (di dua terminal terpisah).

**1. Backend** — http://localhost:8000 (Swagger: http://localhost:8000/docs)

```bash
cd roadsense-backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**2. Frontend** — http://localhost:5173

```bash
cd roadsense-frontend
npm install
copy .env.example .env         # macOS/Linux: cp .env.example .env
npm run dev
```

Detail setup, konfigurasi, dan struktur kode ada di README masing-masing:

- [Backend README](roadsense-backend/README.md)
- [Frontend README](roadsense-frontend/README.md)

## Bagaimana FE & BE Terhubung

- Frontend memanggil backend di `VITE_API_BASE_URL` (default `http://localhost:8000`), semua endpoint di bawah `/api/v1`.
- File (video, foto evidence, foto after-repair) disajikan backend di `/files/...`.
- Backend hanya menerima request dari origin di `CORS_ORIGINS` (default `http://localhost:5173`), jadi frontend harus jalan di port 5173.

## Alur Utama

1. User upload video → backend membuat **job** inference.
2. Inference menghasilkan **damage event** (tipe `D00`/`D10`/`D20`/`D40`, confidence, timestamp, foto evidence).
3. User membuat **report** dari event (bisa menambahkan lokasi).
4. Admin memproses status report: `New → Verified → In Progress → Completed` (atau `Rejected`), setiap perubahan tercatat di riwayat.
