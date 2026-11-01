# RoadSense

Sistem deteksi kerusakan jalan dari video. Video jalan di-upload, model computer vision mendeteksi kerusakan (retak & lubang), lalu hasil deteksi bisa dijadikan laporan yang diverifikasi dan ditindaklanjuti admin.

## Stack

| Bagian   | Teknologi            | Folder                                       |
| -------- | -------------------- | -------------------------------------------- |
| Frontend | React + Vite         | [`roadsense-frontend/`](roadsense-frontend/) |
| Backend  | FastAPI + YOLO       | [`roadsense-backend/`](roadsense-backend/)   |
| Database | PostgreSQL (Docker)  | `docker-compose.yml` di folder backend       |

## Struktur Repo

```
roadsense/
├── roadsense-backend/    # REST API, inference, database  → lihat README di dalamnya
├── roadsense-frontend/   # Web app                        → lihat README di dalamnya
└── README.md             # file ini
```

## Setup dari Nol (laptop baru)

### Yang harus terpasang dulu

| Alat           | Versi                      | Cek                |
| -------------- | -------------------------- | ------------------ |
| Git            | terbaru                    | `git --version`    |
| Docker Desktop | terbaru, **harus sedang berjalan** | `docker --version` |
| Python         | 3.12 (versi yang dites)    | `python --version` |
| Node.js        | 20.19+ atau 22.12+         | `node -v`          |

> Windows: setelah memasang Docker Desktop, buka aplikasinya dan tunggu sampai statusnya "Engine running" sebelum lanjut.

### 1. Clone

```bash
git clone https://github.com/gracielajoel/roadsense.git
cd roadsense
```

Repo ikut membawa file model (`roadsense-backend/weights/*.pt`, sekitar 100 MB), jadi clone pertama agak lama.

### 2. Database (Docker)

```bash
cd roadsense-backend
docker compose up -d
docker compose ps          # status harus "Up"
```

Ini menjalankan PostgreSQL di `localhost:5433` (user, password, dan nama database semuanya `roadsense`). Tabel dibuat otomatis saat backend pertama kali jalan.

### 3. Backend

Masih di folder `roadsense-backend`:

```bash
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env         # macOS/Linux: cp .env.example .env
```

`pip install` pertama kali lama karena memasang torch dan ultralytics.

Buka `.env`, ganti `SECRET_KEY` dengan string acak:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Buat akun admin (hanya sekali), lalu jalankan server:

```bash
python -m app.seed admin@test.com rahasia123 "Admin"
uvicorn app.main:app --reload
```

Backend jalan di http://localhost:8000 (Swagger: http://localhost:8000/docs).

### 4. Frontend

Terminal baru:

```bash
cd roadsense-frontend
npm install
copy .env.example .env         # macOS/Linux: cp .env.example .env
npm run dev
```

Buka http://localhost:5173.

### 5. Login

- **Admin**: email dan password yang tadi dibuat dengan `app.seed`. Masuk ke dashboard admin.
- **Warga**: klik **Register** di halaman login, lalu masuk dan upload video.

## Menjalankan Lagi (hari berikutnya)

```bash
# 1. Buka Docker Desktop, lalu:
cd roadsense-backend
docker compose up -d
venv\Scripts\activate
uvicorn app.main:app --reload

# 2. Terminal lain:
cd roadsense-frontend
npm run dev
```

Data tersimpan di volume Docker, jadi tidak hilang selama volume tidak dihapus. Detail perintah Docker dan cara mengatasi masalah umum ada di [Backend README](roadsense-backend/README.md).

## Dokumentasi Lain

- [Backend README](roadsense-backend/README.md): konfigurasi, Docker, akses per role, mode inference, troubleshooting
- [Frontend README](roadsense-frontend/README.md): struktur kode, halaman, konfigurasi

## Bagaimana FE & BE Terhubung

- Frontend memanggil backend di `VITE_API_BASE_URL` (default `http://localhost:8000`), semua endpoint di bawah `/api/v1`.
- Setiap request membawa token login (`Authorization: Bearer ...`). Tanpa token, backend membalas 401 "Not authenticated".
- File (video, foto evidence, foto after-repair) disajikan backend di `/files/...`.
- Backend hanya menerima request dari origin di `CORS_ORIGINS` (default `http://localhost:5173`), jadi frontend harus jalan di port 5173.

## Alur Utama

1. Warga login, lalu upload video. Backend membuat **job** inference.
2. Inference menghasilkan **damage event** (tipe `D00`/`D10`/`D20`/`D40`, confidence, timestamp, bounding box, foto evidence).
3. Warga mengisi lokasi lalu membuat **report** dari event.
4. Admin memproses status report: `New → Verified → In Progress → Completed` (atau `Rejected`). Foto after-repair wajib sebelum `Completed`, dan setiap perubahan tercatat di riwayat.
