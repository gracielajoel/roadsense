# RoadSense

Aplikasi peringatan lubang untuk pengendara. HP ditaruh di balik kaca depan dan mengirim frame kamera ke server, model computer vision mendeteksi kerusakan jalan (retak & lubang), lalu HP memberi peringatan suara kalau ada lubang di depan. Fokus hanya untuk pengendara: tidak ada pelaporan ke pemerintah dan tidak ada dashboard admin.

**Video demo (59 detik, ada suara):** [`docs/demo/roadsense-driver-demo.mp4`](docs/demo/roadsense-driver-demo.mp4), simulasi dashcam POV, peringatan lubang, ringkasan perjalanan, dan History (inference dummy).

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

Jalankan server:

```bash
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

Klik **Register** di halaman login, buat akun pengendara, lalu masuk. Halaman pertama adalah **Live HUD**. Untuk mencoba tanpa menyetir, pilih **Dashcam simulation**.

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
- File (foto evidence deteksi) disajikan backend di `/files/...`.
- Backend hanya menerima request dari origin di `CORS_ORIGINS` (default `http://localhost:5173`), jadi frontend harus jalan di port 5173.

## Alur Utama

1. Pengendara login dan memulai **live scan** (kamera HP, atau video dashcam untuk simulasi).
2. HP mengirim 2 frame per detik ke server (bisa diturunkan ke 1 atau 0,5 untuk hemat kuota). Server menjalankan model dan membalas kotak deteksi (`D00`/`D10`/`D20`/`D40`).
3. Kalau ada **lubang**, HP berbunyi ("Awas, lubang di depan"), bergetar, dan layar berkedip merah. Retak hanya diberi kotak.
4. Setiap kerusakan unik disimpan sebagai **damage event** (dengan lokasi GPS dan foto) dan bisa dilihat lagi di **History**.
