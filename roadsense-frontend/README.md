# RoadSense Frontend

Frontend RoadSense: web untuk upload video jalan, melihat hasil deteksi kerusakan, mengirim laporan, dan (untuk admin) mengelola laporan perbaikan.

Stack: **React 19 + Vite**, routing pakai **React Router**, request ke backend pakai **Axios**, ikon pakai **lucide-react**.

Setup lengkap dari nol (termasuk Docker dan backend) ada di [README utama](../README.md#setup-dari-nol-laptop-baru).

## Prasyarat

- Node.js 20.19+ atau 22.12+ (cek: `node -v`)
- Backend RoadSense jalan di `http://localhost:8000` (lihat [`../roadsense-backend/README.md`](../roadsense-backend/README.md))
- Satu akun untuk login: daftar lewat halaman login (warga), atau buat admin dengan `python -m app.seed EMAIL PASSWORD` di folder backend

## Menjalankan

```bash
cd roadsense-frontend
npm install
cp .env.example .env      # Windows (PowerShell): copy .env.example .env
npm run dev
```

Buka http://localhost:5173. Kalau muncul "Not authenticated" atau "Could not reach the server", pastikan backend sudah jalan dan kamu sudah login.

Backend belum jalan / mau demo tanpa backend? Set `VITE_USE_MOCK=true` di `.env` lalu restart `npm run dev`. Mode ini melewati login (dianggap admin) dan hanya halaman Citizen yang memakai data contoh dari `src/mocks/` dan `public/demo/`; halaman admin tetap butuh backend.

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

Semua konfigurasi dibaca di [`src/config.js`](src/config.js):

- `API_URL` → `${VITE_API_BASE_URL}/api/v1`, base URL semua endpoint REST.
- `fileUrl(path)` → ubah path file dari backend (`evidence_url`, `after_photo_url`, path video) jadi URL lengkap untuk `<img>` / `<video>`.

Setelah mengubah `.env`, restart `npm run dev`.

## Login & Hak Akses

- Login/register di `/login`. Token JWT disimpan di `localStorage` (`roadsense.token`) dan dikirim axios di setiap request (`src/api/client.js`).
- Kalau backend membalas 401 (token kedaluwarsa), token dihapus dan user dikembalikan ke `/login`. Salah password di form login hanya menampilkan pesan error.
- `RequireAuth` melindungi semua halaman, `RequireAdmin` melindungi `/admin/*` (`src/auth/guards.jsx`). Warga yang membuka `/admin` dikembalikan ke `/`.
- Di komponen, ambil user lewat `useAuth()` → `{ user, isAdmin, signIn, signUp, signOut }`.

## Struktur Folder

```
public/demo/              # Video contoh untuk mode demo
src/
├── api/                  # Semua pemanggilan backend, satu file per resource
│   ├── client.js         # Instance axios (token, 401, parsing error FastAPI)
│   ├── auth.js           # login, register, me
│   ├── videos.js         # upload video, job inference, event per video
│   ├── events.js
│   ├── reports.js        # termasuk upload foto after-repair
│   ├── stats.js
│   ├── users.js
│   └── health.js
├── auth/                 # AuthProvider, useAuth, guards, penyimpanan token
├── components/
│   ├── ui/               # Komponen umum: Button, Badge, Card, StatCard, Field, DataState, BarList
│   ├── inspection/       # Fitur citizen: VideoPlayer, DetectionList, ComplaintForm, ...
│   ├── admin/            # Komponen khusus halaman admin (ReportsTable)
│   └── AppHeader.jsx     # Header, toggle Citizen app / Admin dashboard, logout
├── hooks/                # useFetch, useUserNames
├── layouts/              # MainLayout (header + konten), AdminLayout (tab admin)
├── mocks/                # Data & API palsu untuk VITE_USE_MOCK=true
├── pages/
│   ├── LoginPage.jsx     # Login & register
│   ├── CitizenPage.jsx   # Upload & scan, hasil deteksi, form komplain
│   └── admin/            # Halaman admin dashboard
├── utils/                # Konstanta, format waktu/persen/lokasi, ringkasan statistik
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
- Bungkus data dari `useFetch` dengan `<DataState>` supaya loading dan error tampil seragam.

## Routes

| Path                 | Akses  | Halaman                                           | Endpoint utama |
| -------------------- | ------ | ------------------------------------------------- | -------------- |
| `/login`             | publik | Login & register                                  | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| `/`                  | login  | Citizen app (upload, deteksi, komplain)           | `GET/POST /videos`, `GET /jobs/{id}`, `GET /videos/{id}/events`, `PATCH /events/{id}`, `GET/POST /reports` |
| `/admin`             | admin  | Overview: statistik dan laporan terbaru           | `GET /stats`, `GET /reports` |
| `/admin/reports`     | admin  | Daftar laporan, filter status                     | `GET /reports?status=` |
| `/admin/reports/:id` | admin  | Detail laporan, ubah status, foto after-repair, riwayat | `GET /reports/{id}`, `GET /reports/{id}/history`, `PATCH /reports/{id}`, `POST /reports/{id}/after-photo` |
| `/admin/events`      | admin  | Semua deteksi, koreksi tipe kerusakan             | `GET /events`, `PATCH /events/{id}` |
| `/admin/videos`      | admin  | Daftar video, status analisis, hapus              | `GET /videos`, `GET /jobs`, `DELETE /videos/{id}` |
| `/admin/videos/:id`  | admin  | Player dengan bounding box dan daftar deteksi     | `GET /videos/{id}`, `GET /videos/{id}/events` |
| `/admin/users`       | admin  | Kelola user                                       | `GET/POST /users`, `PATCH/DELETE /users/{id}` |

Dokumentasi lengkap endpoint: http://localhost:8000/docs (Swagger dari FastAPI).

## Alur Halaman Citizen

1. Saat dibuka, menampilkan video terakhir milik user beserta event dan report yang sudah ada.
2. Upload video → progress upload → polling `GET /jobs/{id}` tiap 1 detik sampai `done` → ambil event.
3. Klik salah satu frame deteksi → video lompat ke detik tersebut, bounding box muncul.
4. Isi form komplain, termasuk **latitude/longitude** (tombol "Use my location" atau ketik manual). Backend menolak report untuk event tanpa lokasi, jadi lokasi disimpan dulu lewat `PATCH /events/{id}`, baru `POST /reports`.

## Belum Ada

- Peta persebaran kerusakan (detail laporan hanya memberi link ke OpenStreetMap).
- `road_name`, `landmark`, `description` di form komplain dikirim FE tapi diabaikan backend (`ReportCreate` hanya menerima `event_id`).
- Skor "Road condition" masih dihitung di FE (`utils/inspection.js`), belum dari backend.
- Foto evidence: kalau gambar gagal dimuat, thumbnail otomatis diambil dari frame video.

## Contoh Pemakaian API

```jsx
import { listReports } from '../api/reports'
import DataState from '../components/ui/DataState'
import useFetch from '../hooks/useFetch'

export default function ReportsPage() {
  const { data, loading, error, reload } = useFetch(() => listReports({ status: 'New' }), [])

  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      <ul>{(data || []).map((r) => <li key={r.id}>#{r.id} — {r.status}</li>)}</ul>
    </DataState>
  )
}
```

## Catatan Domain

- Tipe kerusakan (`damage_type`): `D00` retak memanjang, `D10` retak melintang, `D20` retak buaya, `D40` lubang.
- Alur status laporan: `New → Verified → In Progress → Completed`, atau `New → Rejected`. `Completed` butuh foto after-repair. Admin yang mengubah status tercatat otomatis dari token, tidak perlu dikirim dari FE.
- Hanya akun role `user` yang bisa membuat report; admin mendapat 403.
