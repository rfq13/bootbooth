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