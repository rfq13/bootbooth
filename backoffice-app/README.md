Backoffice App

Ringkasan

- Aplikasi backoffice terdiri dari dua layanan: backend (Golang) dan frontend (React + SSR).
- Mendukung SSE/WS untuk realtime, Socket.IO untuk registrasi localbooth, dan integrasi pembayaran via webhook.

Instalasi & Konfigurasi

- Persyaratan: Docker 24+, Docker Compose v2, Node.js 20+ (untuk dev), Go 1.24+ (untuk dev)
- Konfigurasi environment:
  - backend: lihat `backend/.env.example`
  - frontend: lihat `frontend/.env.example`
- Jalankan secara lokal dengan Docker Compose:
  - `docker compose -f backoffice-app/docker-compose.yml up -d`
  - Backend tersedia di `http://localhost:3002`, Frontend SSR di `http://localhost:5210`

Menjalankan di Dev (tanpa build)

- Prasyarat: Node.js 20+, Go 1.24+, dua terminal terpisah, port `3002` dan `5210` tidak sedang dipakai.
- Backend (Golang):
  - PowerShell (Windows):
    - `cd d:\Ngoding\expr\bootbooth\backoffice-app\backend`
    - `setx BACKOFFICE_ADDR ":3002"`
    - `setx FRONTEND_ORIGIN "http://localhost:5210"`
    - `setx BACKOFFICE_JWT_SECRET "dev-secret"`
    - `setx PAYMENT_WEBHOOK_SECRET "webhook-secret"`
    - `go run ./cmd/server`
  - Git Bash:
    - `cd /d/Ngoding/expr/bootbooth/backoffice-app/backend`
    - `BACKOFFICE_ADDR=:3002 FRONTEND_ORIGIN=http://localhost:5210 BACKOFFICE_JWT_SECRET=dev-secret PAYMENT_WEBHOOK_SECRET=webhook-secret go run ./cmd/server`
  - Healthcheck: `curl http://localhost:3002/healthz`
- Frontend (Vite dev server):
  - `cd d:\Ngoding\expr\bootbooth\backoffice-app\frontend`
  - `npm install`
  - `npm run dev`
  - Akses: `http://localhost:5210/`
- Integrasi dev:
  - Frontend otomatis menggunakan API base `http://localhost:3002` saat berjalan di port `5210` (`src/utils/api.ts`).
  - CORS backend dibatasi oleh `FRONTEND_ORIGIN=http://localhost:5210` agar cookie CSRF dan header bekerja saat POST.
  - WebSocket/Socket.IO tersedia di path `/socket.io/` pada backend.

Build & Test

- Frontend: `npm ci && npm run build` (di folder frontend)
- Backend: `go build ./...` (di folder backend)
- Unit test frontend: `npm run test`

Deploy Production (DigitalOcean)

- Server:
  - Droplet Ubuntu 22.04 LTS
  - Instal Docker & Compose: `curl -fsSL https://get.docker.com | sh`
  - Buka port: `3002/tcp` (backend), `5210/tcp` (frontend) via ufw/nginx reverse proxy
- Langkah:
  1. Siapkan secrets di GitHub (lihat bagian CI/CD)
  2. Jalankan workflow deploy (staging atau production)
  3. SSH runner akan menyinkronkan file compose dan environment ke server dan menjalankan `docker compose up -d`
- Rollback:
  - Gunakan image tag versi sebelumnya dan jalankan ulang compose
  - Simpan artefak image/tag setiap rilis untuk kemudahan rollback

CI/CD

- Workflow CI: build & test otomatis (frontend vitest, backend build/vet)
- Workflow Deploy: SSH ke DigitalOcean, apply compose untuk staging & prod
- Secrets yang diperlukan:
  - `DO_HOST`, `DO_USER`, `DO_SSH_KEY` (deployment)
  - `BACKEND_ENV` (isi `.env` backend), `FRONTEND_ENV` (isi `.env` frontend)

API Contoh

- Login: `POST /auth/login` body `{ email, password }`
- Outlets: `GET /outlets`
- SSE: `GET /events`
- Socket.IO path: `/socket.io/` (event `register` untuk localbooth)

Checklist Pre-Deployment

- [ ] Secrets repo terisi dan valid
- [ ] Compose tervalidasi `docker compose config`
- [ ] Port & firewall server telah dikonfigurasi
- [ ] Healthcheck endpoint `GET /healthz` berfungsi

Strategi Rollback

- Gunakan versi image sebelumnya
- Simpan backup compose/env rilis terakhir
- Verifikasi healthcheck sebelum alih trafik
