# RoadSense Frontend

Frontend RoadSense: web untuk upload video jalan, melihat hasil deteksi kerusakan, dan mengelola laporan perbaikan.

Stack: **React 19 + Vite**, routing pakai **React Router**, request ke backend pakai **Axios**, ikon pakai **lucide-react**.

## Prasyarat

- Node.js 20.19+ atau 22.12+ (cek: `node -v`)
- Backend RoadSense jalan di `http://localhost:8000` (lihat [`../roadsense-backend/README.md`](../roadsense-backend/README.md))

## Menjalankan

```bash
cd roadsense-frontend
npm install
cp .env.example .env      # Windows (PowerShell): copy .env.example .env
npm run dev
```

Buka http://localhost:5173. Halaman **Admin dashboard → Overview** menampilkan status koneksi ke backend; kalau "Offline", pastikan backend sudah jalan dan `VITE_API_BASE_URL` di `.env` benar.

Backend belum jalan / mau demo tanpa backend? Set `VITE_USE_MOCK=true` di `.env` lalu restart `npm run dev`; halaman Citizen akan memakai video & hasil deteksi contoh dari `src/mocks/` dan `public/demo/`.

> Port 5173 sengaja dikunci (`strictPort`) karena port ini yang diizinkan di `CORS_ORIGINS` backend. Kalau port dipakai aplikasi lain, matikan dulu aplikasinya atau tambahkan origin baru di `CORS_ORIGINS` backend.

## Script

| Perintah          | Fungsi                                   |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Dev server dengan hot reload             |
| `npm run build`   | Build production ke folder `dist/`       |
| `npm run preview` | Menjalankan hasil build secara lokal     |
| `npm run lint`    | Cek kode dengan oxlint                   |

## Konfigurasi

| Variabel            | Default                 | Keterangan                                          |
| ------------------- | ----------------------- | --------------------------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | URL backend, **tanpa** `/api/v1` dan tanpa `/` akhir |
| `VITE_USE_MOCK`     | `false`                 | `true` = pakai data demo, backend tidak dipanggil   |
| `VITE_DEMO_USER_ID` | `1`                     | id user (role `user`) pembuat report, sementara belum ada login |

Semua konfigurasi dibaca di [`src/config.js`](src/config.js):

- `API_URL` → `${VITE_API_BASE_URL}/api/v1`, base URL semua endpoint REST.
- `fileUrl(path)` → ubah path file dari backend (`evidence_url`, `after_photo_path`, path video) jadi URL lengkap untuk `<img>` / `<video>`.

Setelah mengubah `.env`, restart `npm run dev`.

## Struktur Folder

```
public/demo/              # Video contoh untuk mode demo
src/
├── api/                  # Semua pemanggilan backend, satu file per resource
│   ├── client.js         # Instance axios (baseURL + parsing error FastAPI)
│   ├── health.js
│   ├── videos.js         # upload video, job inference, event per video
│   ├── events.js
│   ├── reports.js
│   └── users.js
├── components/
│   ├── ui/               # Komponen umum: Button, Badge, Card, StatCard, Field
│   ├── inspection/       # Komponen fitur: VideoPlayer, DetectionList, ComplaintForm, ...
│   ├── AppHeader.jsx     # Header + toggle Citizen app / Admin dashboard
│   └── Placeholder.jsx   # Isi sementara untuk halaman yang belum dibuat
├── hooks/                # Custom hooks (useFetch)
├── layouts/              # MainLayout (header + konten), AdminLayout (tab admin)
├── mocks/                # Data & API palsu untuk VITE_USE_MOCK=true
├── pages/
│   ├── CitizenPage.jsx   # Upload & scan, hasil deteksi, form komplain
│   └── admin/            # Halaman admin dashboard
├── utils/                # Konstanta, format waktu/persen, ringkasan statistik
├── config.js             # API base URL, mode mock, fileUrl()
├── router.jsx            # Daftar route
├── App.jsx
├── main.jsx
└── index.css             # Style global (design token di :root)
```

Aturan singkat:

- Komponen **jangan** memanggil `axios` langsung, selalu lewat fungsi di `src/api/`. Kalau fungsinya perlu versi demo, tambahkan juga di `src/mocks/` dan cek `USE_MOCK` di file `api/` (lihat `api/videos.js`).
- Halaman baru: buat file di `pages/`, lalu daftarkan di `router.jsx`.
- Warna, radius, dll. ada sebagai CSS variable di `:root` (`index.css`); pakai variabel itu, jangan hardcode warna.
- Error dari backend sudah diubah jadi `Error` dengan pesan dari `detail` FastAPI, jadi cukup tampilkan `error.message`.

## Routes

| Path                 | Halaman                                   | Endpoint utama                                       |
| -------------------- | ----------------------------------------- | ---------------------------------------------------- |
| `/`                  | Citizen app (upload, deteksi, komplain)   | `GET /videos`, `POST /videos`, `GET /jobs/{id}`, `GET /videos/{id}/events`, `GET/POST /reports` |
| `/admin`             | Overview (status koneksi backend)         | `GET /health`                                        |
| `/admin/reports`     | Daftar laporan *(belum dibuat)*           | `GET /reports?status=`                               |
| `/admin/reports/:id` | Detail laporan *(belum dibuat)*           | `GET /reports/{id}`, `GET /reports/{id}/history`, `PATCH /reports/{id}` |
| `/admin/events`      | Hasil deteksi *(belum dibuat)*            | `GET /events`                                        |
| `/admin/videos`      | Daftar video *(belum dibuat)*             | `GET /videos`, `GET /jobs`                           |
| `/admin/videos/:id`  | Detail video *(belum dibuat)*             | `GET /videos/{id}/events`                            |
| `/admin/users`       | Kelola user *(belum dibuat)*              | `GET /users`                                         |

Dokumentasi lengkap endpoint: http://localhost:8000/docs (Swagger dari FastAPI).

## Alur Halaman Citizen

1. Saat dibuka, menampilkan video terakhir di backend beserta event dan report yang sudah ada.
2. Upload video → progress upload → polling `GET /jobs/{id}` tiap 1 detik sampai `done` → ambil event.
3. Klik salah satu frame deteksi → video lompat ke detik tersebut, bounding box muncul (kalau event punya `bbox`).
4. Isi form → `POST /reports` dengan `event_id` frame terpilih.

## Belum Ada di Backend (dipakai FE kalau tersedia)

- `bbox` (`[x, y, w, h]` relatif 0-1) dan `frame` di EventOut, untuk kotak deteksi & nomor frame. Tanpa ini kotak tidak ditampilkan.
- `road_name`, `landmark`, `description` di ReportCreate. FE sudah mengirim field ini, tapi backend sekarang mengabaikannya.
- Skor "Road condition" masih dihitung di FE (`utils/inspection.js`), belum dari backend.
- Foto evidence: kalau gambar gagal dimuat (sekarang file dummy 0 byte), thumbnail otomatis diambil dari frame video.

## Contoh Pemakaian API

```jsx
import { listReports } from '../api/reports'
import useFetch from '../hooks/useFetch'

export default function ReportsPage() {
  const { data, loading, error, reload } = useFetch(() => listReports({ status: 'New' }), [])

  if (loading) return <p>Memuat…</p>
  if (error) return <p>Gagal: {error.message}</p>
  return <ul>{data.map((r) => <li key={r.id}>#{r.id} — {r.status}</li>)}</ul>
}
```

Alur upload video:

```js
import { uploadVideo, getJob } from '../api/videos'

const { job_id } = await uploadVideo(file, (e) => console.log(e.loaded / e.total))
const job = await getJob(job_id) // poll tiap beberapa detik sampai status 'done' / 'failed'
```

## Catatan Domain

- Tipe kerusakan (`damage_type`): `D00` retak memanjang, `D10` retak melintang, `D20` retak buaya, `D40` lubang.
- Alur status laporan: `New → Verified → In Progress → Completed`, atau `New → Rejected`. Ubah status wajib mengirim `changed_by` (id admin).
- Belum ada login/token: `user_id` dan `changed_by` masih dikirim manual lewat body request.
