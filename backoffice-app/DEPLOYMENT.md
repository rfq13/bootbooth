Deployment DigitalOcean

Prasyarat Server
- Droplet Ubuntu 22.04 LTS
- Docker & Docker Compose v2 terpasang
- Akses SSH dengan key pair
- Firewall: buka port 3002 (backend) dan 5210 (frontend) atau gunakan reverse proxy (Nginx)

Prosedur Deploy
1. Siapkan secrets GitHub:
   - `DO_HOST`: alamat server
   - `DO_USER`: user SSH
   - `DO_SSH_KEY`: private key SSH
   - `BACKEND_ENV`: isi file `.env` backend
   - `FRONTEND_ENV`: isi file `.env` frontend
2. Jalankan workflow `Backoffice Deploy` dengan environment `staging` atau `production`.
3. Workflow akan menyalin `docker-compose.yml` dan menulis env di server lalu menjalankan `docker compose up -d`.

Konfigurasi Server
- Nginx (opsional) untuk reverse proxy:
  - Proxy `backend` ke `localhost:3002`, `frontend` ke `localhost:5210`
- UFW contoh:
  - `ufw allow 22/tcp`
  - `ufw allow 3002/tcp`
  - `ufw allow 5210/tcp`
  - `ufw enable`

Checklist Pre-Deployment
- [ ] Secrets repository terkonfigurasi
- [ ] `.env` backend & frontend diisi placeholder aman (tanpa secrets hardcoded)
- [ ] Compose tervalidasi `docker compose config`
- [ ] Endpoint `GET /healthz` tersedia pada backend
- [ ] Origin CORS (`FRONTEND_ORIGIN`) sesuai domain frontend

Strategi Rollback
- Gunakan image/tag versi sebelumnya dan jalankan ulang compose
- Simpan salinan `docker-compose.yml` dan env setiap rilis
- Verifikasi healthcheck setelah rollback sebelum mengembalikan trafik