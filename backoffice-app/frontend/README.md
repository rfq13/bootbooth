Frontend (React + SSR)

Persyaratan Sistem
- Node.js 20+
- Vite 5, Tailwind

Instalasi & Dev
- Salin `frontend/.env.example` menjadi `.env` dan sesuaikan
- Jalankan dev: `npm ci && npm run dev`
- Build produksi SSR: `npm run build`
- Preview SSR: `npm run preview`

Konfigurasi
- Variabel penting:
  - `VITE_API_BASE_URL` → base URL backend (default: http://localhost:3002)
  - `VITE_SSE_URL` / `VITE_WS_URL` → realtime
  - `VITE_BACKOFFICE_SOCKET_URL` → Socket.IO backend untuk registrasi localbooth
  - `VITE_BOOTH_NAME`, `VITE_BOOTH_LOCATION`, `VITE_OUTLET_ID` → identitas localbooth

Animasi & Aset
- GSAP ScrollTrigger diaktifkan secara dinamis di Landing & Dashboard
- Hero image menggunakan `<picture>` (WebP + JPEG fallback) dan preload

Deploy
- Gunakan Dockerfile di `frontend/Dockerfile`
- Compose mengekspos port 8080 di container ke 5210 host