# RoadSense Frontend

Frontend RoadSense: aplikasi web mobile untuk pengendara. Live HUD memberi peringatan suara saat ada lubang di depan (deteksi dijalankan di server), dan History menyimpan perjalanan sebelumnya. Tidak ada pelaporan dan tidak ada dashboard admin.

Stack: **React 19 + Vite**, routing pakai **React Router**, request ke backend pakai **Axios**, ikon pakai **lucide-react**.

Setup lengkap dari nol (termasuk Docker dan backend) ada di [README utama](../README.md#setup-dari-nol-laptop-baru).

## Prasyarat

- Node.js 20.19+ atau 22.12+ (cek: `node -v`)
- Backend RoadSense jalan di `http://localhost:8000` (lihat [`../roadsense-backend/README.md`](../roadsense-backend/README.md))
- Satu akun untuk login: daftar lewat halaman login

## Menjalankan

```bash
cd roadsense-frontend
npm install
cp .env.example .env      # Windows (PowerShell): copy .env.example .env
npm run dev
```

Buka http://localhost:5173. Kalau muncul "Not authenticated" atau "Could not reach the server", pastikan backend sudah jalan dan kamu sudah login.

Backend belum jalan / mau demo tanpa backend? Set `VITE_USE_MOCK=true` di `.env` lalu restart `npm run dev`. Mode ini melewati login (dianggap pengendara demo), live scan memakai deteksi palsu dari `src/mocks/live.js`, dan History menampilkan perjalanan selama tab terbuka.

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
- `fileUrl(path)` → ubah path file dari backend (`evidence_url`) jadi URL lengkap untuk `<img>`.

Setelah mengubah `.env`, restart `npm run dev`.

## Login & Hak Akses

- Login/register di `/login`. Token JWT disimpan di `localStorage` (`roadsense.token`) dan dikirim axios di setiap request (`src/api/client.js`).
- Kalau backend membalas 401 (token kedaluwarsa), token dihapus dan user dikembalikan ke `/login`. Salah password di form login hanya menampilkan pesan error.
- `RequireAuth` melindungi semua halaman (`src/auth/guards.jsx`).
- Di komponen, ambil user lewat `useAuth()` → `{ user, signIn, signUp, signOut }`.

## Struktur Folder

```
public/
├── demo/dashcam-pov.mp4  # Video dashcam bawaan untuk mode simulasi
└── manifest.webmanifest  # Supaya bisa di-install ke home screen HP
src/
├── api/
│   ├── client.js         # Instance axios (token, 401, parsing error FastAPI)
│   ├── auth.js           # login, register, me
│   └── live.js           # sesi live scan, kirim frame, riwayat perjalanan
├── auth/                 # AuthProvider, useAuth, guards, penyimpanan token
├── components/
│   ├── ui/               # Komponen umum: Button, Badge, Card, StatCard, Field, DataState
│   ├── inspection/       # BoundingBox, FrameThumb
│   ├── DriveDetections.jsx  # Daftar kerusakan satu perjalanan (ringkasan & History)
│   └── AppHeader.jsx     # Header, navigasi, logout
├── hooks/                # useFetch
├── layouts/              # MainLayout (header + konten + tab bar bawah di HP)
├── mocks/                # API palsu untuk VITE_USE_MOCK=true
├── pages/
│   ├── LoginPage.jsx     # Login & register
│   ├── LiveScanPage.jsx  # Live HUD: kamera / simulasi dashcam, peringatan, ringkasan
│   └── HistoryPage.jsx   # Riwayat perjalanan
├── utils/                # Konstanta & keparahan, format, jarak GPS, peringatan suara (alerts.js)
├── config.js             # API base URL, mode mock, fileUrl()
├── router.jsx            # Daftar route
├── index.css             # Style global (design token di :root)
└── telemetry.css         # Style HUD, tab bar, History
```

Aturan singkat:

- Komponen **jangan** memanggil `axios` langsung, selalu lewat fungsi di `src/api/`. Kalau fungsinya perlu versi demo, tambahkan juga di `src/mocks/` dan cek `USE_MOCK` di file `api/` (lihat `api/live.js`).
- Halaman baru: buat file di `pages/`, lalu daftarkan di `router.jsx`.
- Warna, radius, dll. ada sebagai CSS variable di `:root` (`index.css`); pakai variabel itu, jangan hardcode warna.
- Error dari backend sudah diubah jadi `Error` dengan pesan dari `detail` FastAPI, jadi cukup tampilkan `error.message`.
- Bungkus data dari `useFetch` dengan `<DataState>` supaya loading dan error tampil seragam.

## Routes

| Path       | Halaman | Endpoint utama |
| ---------- | ------- | -------------- |
| `/login`   | Login & register | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| `/`        | **Live HUD**: kamera HP atau simulasi dashcam, peringatan lubang, ringkasan perjalanan | `POST /live/sessions`, `POST /live/sessions/{id}/frames`, `POST /live/sessions/{id}/end`, `GET /videos/{id}/events` |
| `/history` | Riwayat perjalanan, kerusakan per perjalanan, hapus perjalanan | `GET /videos` (sesi `is_live`), `GET /videos/{id}/events`, `DELETE /videos/{id}` |

Dokumentasi lengkap endpoint: http://localhost:8000/docs (Swagger dari FastAPI).

## Live Scan dari HP

Alur: HP di balik kaca depan → kamera belakang → tiap 1 detik (atau 2 detik) frame dikecilkan ke 640px JPEG (±25 KB) → dikirim ke backend → backend menjalankan model dan membalas kotak deteksi → HUD menampilkan kotak + toast "POTHOLE LOGGED". **Tidak ada inference di HP.**

- Frame berikutnya baru dikirim setelah balasan frame sebelumnya datang, jadi kalau sinyal lemah frame dilewati (tidak menumpuk). Kalau koneksi putus, HUD menampilkan "Reconnecting" dan mencoba lagi dengan jeda makin panjang.
- Layar dijaga tetap menyala (Wake Lock API). Tombol **DIM** menggelapkan layar (hemat baterai di layar OLED) sementara scan tetap jalan.
- Jarak tempuh dihitung dari GPS (titik dengan akurasi > 30 m diabaikan). Kecepatan dari `coords.speed` GPS.
- Portrait: layout seperti Figma 04. Landscape (HP di dudukan dashboard): kamera penuh layar, HUD melayang di atasnya.
- Bisa di-"install" ke home screen (`public/manifest.webmanifest`), terbuka langsung di Live HUD tanpa address bar.

### Simulasi dashcam POV

Untuk demo/uji tanpa menyetir: di Live HUD pilih **Dashcam simulation**. Video POV diputar sebagai pengganti kamera HP dan frame-nya dikirim lewat jalur yang sama persis dengan scan sungguhan (1 frame/detik → server → kotak deteksi).

- Video bawaan: `public/demo/dashcam-pov.mp4` (23 detik, rekaman dashcam POV jalan tol dari video uji tim `test_1_pothole.mp4`, judul di awal dipotong). Tombol **Choose video** memuat rekaman POV sendiri dari file.
- GPS disimulasikan: mulai dari Surabaya, bergerak lurus 40 km/jam, jadi setiap deteksi tetap punya lokasi di History. HUD menandai mode ini dengan `SIM` dan `SIM GPS`.
- Sesi otomatis selesai saat video habis.
- Tidak perlu HTTPS (tidak memakai kamera), jadi bisa dicoba langsung di `http://localhost:5173`.

### Peringatan lubang

Kalau server mendeteksi lubang (SEV-1, `D40`), HP:

- membunyikan 3 bip (Web Audio API, tanpa file suara) lalu suara **"Awas, lubang di depan"** (`speechSynthesis`, suara Indonesia kalau tersedia di HP),
- bergetar (Android),
- menampilkan banner merah berkedip dan tepi layar merah.

Retak hanya diberi kotak, tanpa suara, supaya tidak mengganggu. Ada jeda 2,5 detik antar peringatan, dan tombol **SOUND/MUTED** di HUD. Kode: `src/utils/alerts.js`. Halaman lain bisa mendengarkan event `roadsense:alert` di `window`.

### Mencoba di HP

Kamera di browser HP **wajib HTTPS**. Cara paling gampang: tunnel HTTPS ke dev server.

1. Di `.env` frontend, kosongkan URL backend supaya request lewat proxy Vite (`/api`, `/files` → `localhost:8000`):
   ```
   VITE_API_BASE_URL=
   ```
2. Jalankan backend (`uvicorn app.main:app`) dan `npm run dev` seperti biasa.
3. Buka tunnel, misalnya [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (gratis, tanpa akun):
   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```
4. Buka URL `https://....trycloudflare.com` yang muncul di HP lalu login. Halaman pertama sudah Live HUD.

Domain `*.trycloudflare.com` dan `*.ngrok-free.app` sudah diizinkan di `vite.config.js` (`allowedHosts`). Proxy Vite bisa diarahkan ke backend lain dengan env `ROADSENSE_BACKEND=http://host:port`.

Tanpa backend: `VITE_USE_MOCK=true` juga mendukung live scan (deteksi palsu dari `src/mocks/live.js`).

## Tampilan (Figma)

Warna, font, dan komponen mengikuti file Figma "MANPRO DETEKSI JALAN": token warna di `:root` (`src/index.css`), komponen layar baru di `src/telemetry.css`. Font: Inter + JetBrains Mono. Tingkat keparahan (`SEVERITY` di `utils/constants.js`): lubang (`D40`) = SEV-1 merah, retak = SEV-2 kuning; warna bounding box mengikuti ini.

Ruang lingkup sekarang hanya pengendara (keputusan tim: pelaporan butuh integrasi dengan pemerintah, jadi tidak dibuat). Layar admin di Figma (GIS triage, kanban perbaikan) dan halaman laporan warga tidak dipakai. Bagian Figma lain yang datanya tidak ada juga tidak dibuat: RTK/LiDAR/IRI/OBD, poin/leaderboard, voice tag.

## Belum Ada

- Peta perjalanan (sekarang tiap kerusakan hanya diberi link ke OpenStreetMap).
- Sesi live yang tidak diakhiri (HP mati / tab ditutup paksa) tetap berstatus `processing`; belum ada penutupan otomatis.
- Endpoint report/admin/upload video masih ada di backend tapi tidak dipakai frontend lagi.

## Contoh Pemakaian API

```jsx
import { listLiveSessions } from '../api/live'
import DataState from '../components/ui/DataState'
import useFetch from '../hooks/useFetch'

export default function DriveList() {
  const { data, loading, error, reload } = useFetch(listLiveSessions)

  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      <ul>{(data || []).map((d) => <li key={d.id}>{d.filename}</li>)}</ul>
    </DataState>
  )
}
```

## Catatan Domain

- Tipe kerusakan (`damage_type`): `D00` retak memanjang, `D10` retak melintang, `D20` retak buaya, `D40` lubang.
- Peringatan suara hanya untuk lubang (`D40`, SEV-1). Retak (`D00`/`D10`/`D20`, SEV-2) hanya diberi kotak.
