# Panduan Pendaftaran Identitas Booth

Versi: 1.1.0  
Tanggal Revisi: 2025-11-19

## 1. Persyaratan Dokumen

- Tidak memerlukan JWT atau token autentikasi khusus untuk endpoint registrasi
- Tidak memerlukan kunci enkripsi AES untuk pendaftaran
- Data booth:
  - Nama booth (3–50 karakter, alfanumerik + spasi/tanda umum)
  - Lokasi GPS (latitude −90..90, longitude −180..180)
  - Kode outlet (opsional), digunakan saat registrasi ke hub backoffice
- Contoh payload registrasi (valid):
  ```json
  {
    "booth_name": "LocalBooth A",
    "location": { "lat": -6.2, "lng": 106.816666 }
  }
  ```

## 2. Langkah Pendaftaran (Berurutan)

- Siapkan backend:
  - Jalankan backend (`cmd/server`) dan pastikan `POST /api/booth/register` tersedia
- Jalankan server C++ (local photobooth) pada port API `3001`
- Buka aplikasi client (UI localbooth):
  - Client menjalankan pre-check ke `GET http://localhost:3001/api/identity`
  - Jika belum ada identity, render form registrasi (nama + lokasi GPS, dengan fallback manual bila gagal)
- Submit form registrasi:
  - Client mengirim `POST http://localhost:3002/api/booth/register` dengan payload di atas
  - Backend merespons JSON: `{ success: true, data: BoothIdentity }` tanpa enkripsi
  - Client meneruskan identity ke server C++: `POST http://localhost:3001/api/identity`
- Validasi penyimpanan:
  - Pastikan `GET http://localhost:3001/api/identity` mengembalikan `success: true`
  - Seluruh fitur (preview/capture/socket) aktif setelah identity tersimpan

Referensi implementasi:

- Client pre-check dan gating: `client/src/App.jsx:80`, `client/src/App.jsx:339`
- Form registrasi: `client/src/components/BoothRegistration.jsx:1`
- Backend handler registrasi tanpa AES/JWT: `backoffice-app/backend/internal/router.go:180`
- Rate limit per-IP: `backoffice-app/backend/internal/middleware.go:33`
- Server C++ endpoint & gating: `server-cpp/src/socket_io_server.cpp:377`, `server-cpp/src/socket_io_server.cpp:118`
- Server C++ store: `server-cpp/src/booth_identity.cpp:1`, `server-cpp/include/booth_identity.h:1`

## 3. Diagram Alur (Flowchart)

```mermaid
flowchart TD
    A[Client buka aplikasi] --> B{GET /api/identity}
    B -- success:false --> C[Render Form Registrasi]
    C --> D[Geolocation API]
    D -- ok --> E[Validasi Nama & Lokasi]
    D -- gagal --> C2[Input manual lat/lng]
    E --> F[POST /api/booth/register (backend)]
    F -- success --> G[Terima BoothIdentity]
    G --> H[POST /api/identity (server-cpp)]
    H -- success --> I[Identity tersimpan]
    I --> J[Gating fitur dibuka (preview/capture/socket)]
    B -- success:true --> J
```

## 4. Informasi Kontak Bantuan Teknis

- Email: `support@bootbooth.local`
- Telepon: `+62-21-0000-0000`
- Kanal chat internal: `#bootbooth-ops` (Slack/Mattermost)

## 5. FAQ

- Bagaimana jika Geolocation API ditolak?
  - Gunakan input manual lat/lng pada form. Lihat validasi rentang di UI.
- Apakah perlu CSRF untuk endpoint registrasi?
  - Endpoint diproteksi JWT dan diakses programatik; CSRF tidak diterapkan di handler ini.
- Bagaimana jika ingin mengubah lokasi setelah registrasi?
  - Lakukan registrasi ulang lewat form; identity baru akan menimpa entri terakhir di store.
- Apa yang terjadi jika identity belum ada?
  - Server C++ memblokir fitur (gating) dan hanya menampilkan form registrasi.
- Bagaimana memverifikasi penyimpanan?
  - Cek `GET /api/identity` dan file `data/booth_identity.json` pada server C++.

## 6. Batas Waktu dan Jadwal Penting

- Cutoff pendaftaran sebelum event: H‑24 dari jam mulai operasional
- Jadwal verifikasi teknis:
  - T‑7 hari: pengujian end‑to‑end di lingkungan staging
  - T‑3 hari: pengisian kunci enkripsi dan validasi backend
  - T‑1 hari: verifikasi perangkat dan konektivitas di lokasi

## 7. Contoh Dokumen Valid

- Payload registrasi:
  ```json
  {
    "booth_name": "Booth Hall A",
    "location": { "lat": -6.175392, "lng": 106.827153 }
  }
  ```

## 8. Riwayat Versi

- 1.0.0 — 2025‑11‑19 — Rilis awal panduan pendaftaran
