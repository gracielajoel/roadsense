# RoadSense Backend

REST API (FastAPI), inference video (YOLO + BoT-SORT), dan database (PostgreSQL).

Langkah setup dari nol untuk laptop baru ada di [README utama](../README.md#setup-dari-nol-laptop-baru). Dokumen ini berisi detailnya.

## Menjalankan (ringkas)

```bash
docker compose up -d                 # database
python -m venv venv
venv\Scripts\activate                # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env               # macOS/Linux: cp .env.example .env
python -m app.seed admin@test.com rahasia123 "Admin"
uvicorn app.main:app --reload
```

Swagger: http://localhost:8000/docs. Cek hidup: http://localhost:8000/health.

## Docker (PostgreSQL)

`docker-compose.yml` menjalankan satu container Postgres 16.

| Pengaturan | Nilai         |
| ---------- | ------------- |
| Host       | `localhost`   |
| Port       | `5433` (bukan 5432, supaya tidak bentrok dengan Postgres lokal) |
| Database   | `roadsense`   |
| User       | `roadsense`   |
| Password   | `roadsense`   |

| Perintah                          | Fungsi                                           |
| --------------------------------- | ------------------------------------------------ |
| `docker compose up -d`            | Nyalakan database (jalankan di folder ini)       |
| `docker compose ps`               | Cek status container                             |
| `docker compose logs db`          | Lihat log database                               |
| `docker compose stop`             | Matikan, **data tetap ada**                      |
| `docker compose down`             | Hapus container, **data tetap ada** (di volume)  |
| `docker compose down -v`          | Hapus container **dan semua data**               |

Masuk ke database lewat terminal:

```bash
docker compose exec db psql -U roadsense -d roadsense
```

Di dalam `psql`: `\dt` (daftar tabel), `select * from reports;`, `\q` (keluar). Bisa juga lewat pgAdmin / DBeaver dengan setelan di tabel atas.

Tabel: `users`, `videos`, `jobs`, `damage_events`, `reports`, `report_status_logs`. Semuanya dibuat otomatis saat backend start.

## Konfigurasi (`.env`)

Salin dari `.env.example`. Variabel penting:

| Variabel              | Keterangan                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`        | Postgres (default di contoh) atau SQLite (`sqlite:///./roadsense.db`)     |
| `STORAGE_DIR`         | Folder video, evidence, foto after-repair (dibuat otomatis, tidak ikut git) |
| `CORS_ORIGINS`        | Origin frontend yang diizinkan, pisah koma                                 |
| `MODEL_PATH`          | File model `.pt` (default `./weights/budget80_map50_epoch79.pt`)          |
| `MODEL_CONF`          | Ambang confidence deteksi (default 0.25)                                   |
| `USE_DUMMY_INFERENCE` | `true` = deteksi palsu (cadangan demo), `false` = model asli               |
| `SECRET_KEY`          | Kunci penanda token login. **Wajib diganti** di setiap mesin               |

Setelah mengubah `.env`, **restart uvicorn** (auto-reload hanya memantau file `.py`).

## Akun & Akses

Ada dua role. Pendaftaran publik (`POST /auth/register`) selalu membuat `user`. Akun admin dibuat lewat seed atau oleh admin lain.

```bash
python -m app.seed EMAIL PASSWORD "Nama"
```

Kalau email sudah ada, role-nya dijadikan admin dan passwordnya diganti.

| Aksi                               | user (warga)                 | admin          |
| ---------------------------------- | ---------------------------- | -------------- |
| Upload video, lihat hasil deteksi  | milik sendiri                | semua          |
| Isi lokasi event (`PATCH /events`) | milik sendiri                | semua + koreksi tipe |
| Buat report                        | ya (event dari videonya)     | tidak          |
| Ubah status report, upload foto after-repair | tidak              | ya             |
| Kelola user, lihat semua report    | tidak                        | ya             |
| Statistik (`/stats`)               | data sendiri                 | seluruh sistem |

Login memakai form-encoded: `POST /api/v1/auth/login` dengan `username` (email) dan `password`. Hasilnya token yang dikirim sebagai `Authorization: Bearer <token>`.

## Alur Status Report

`New → Verified → In Progress → Completed`, atau `New → Rejected`. Foto after-repair hanya bisa diunggah saat `In Progress`/`Completed` dan wajib ada sebelum `Completed`. Report hanya bisa dibuat kalau event sudah punya lokasi (latitude/longitude).

## Mode Inference

- `USE_DUMMY_INFERENCE=false`: video diproses model di `MODEL_PATH` (YOLO + BoT-SORT). Kelas model: Longitudinal Crack (`D00`), Transverse Crack (`D10`), Alligator Crack (`D20`), Pothole (`D40`).
- `USE_DUMMY_INFERENCE=true`: hasil deteksi palsu, berguna sebagai cadangan demo.

Model sementara ini cukup lemah dan sering tidak mendeteksi apa pun pada footage sehari-hari. Untuk melihat apa yang sebenarnya dilihat model:

```bash
python diagnose_video.py path\ke\video.mp4          # setelan sama persis dengan backend
python diagnose_video.py path\ke\video.mp4 0.10     # coba confidence lebih rendah
```

## Troubleshooting

| Gejala | Penyebab & solusi |
| ------ | ----------------- |
| `connection refused` ke `localhost:5433` saat backend start | Container database belum jalan. Buka Docker Desktop, lalu `docker compose up -d`, tunggu beberapa detik, jalankan ulang backend. |
| `Not authenticated` / 401 di frontend | Belum login atau token kedaluwarsa. Login ulang. |
| "Email atau password salah" untuk akun admin | Akunnya belum dibuat di database ini. Jalankan `python -m app.seed ...`. |
| Hasil deteksi 0 | Model tidak mengenali footage itu. Cek dengan `diagnose_video.py`, coba video lain, atau set `USE_DUMMY_INFERENCE=true`. |
| "Lokasi event belum diisi" saat submit report | Isi latitude/longitude di form komplain (atau tombol "Use my location"). |
| `Model tidak ditemukan` | File `.pt` tidak ada di `MODEL_PATH`. Pastikan `weights/` ikut ter-clone. |
| `ModuleNotFoundError` | Virtual environment belum aktif atau `pip install -r requirements.txt` belum dijalankan. |
| Frontend kena CORS error | Frontend harus di port 5173, atau tambahkan origin-nya ke `CORS_ORIGINS`. |
