Backend (Golang)

Persyaratan Sistem
- Go 1.24+
- Postgres (disarankan via Supabase pooler)
- Redis (opsional)

Instalasi
- Salin `backend/.env.example` menjadi `.env` dan isi nilai sesuai lingkungan
- Build: `go build ./cmd/server`
- Jalankan lokal (tanpa Docker): `BACKOFFICE_ADDR=:8080 go run ./cmd/server`

Migrasi & Seeding
- Migrate: `./migrate -db "$DATABASE_URL" -up -dir backend/migrations`
- Rollback: `./migrate -db "$DATABASE_URL" -down -dir backend/migrations`
- Seeding: `./seed -db "$DATABASE_URL" -env dev -dir backend/seeds`

Konfigurasi
- Lihat daftar variabel di `.env.example`:
  - `BACKOFFICE_ADDR`: alamat bind server
  - `FRONTEND_ORIGIN`: origin CORS
  - `BACKOFFICE_JWT_SECRET`: secret JWT admin
  - `PAYMENT_WEBHOOK_SECRET`: verifikasi signature webhook
  - `DATABASE_URL`: koneksi Postgres
  - `REDIS_URL`: koneksi Redis

API Utama
- `POST /auth/login` → JWT admin
- `GET /outlets`, `GET /admin-users`, `GET /bookings`
- `POST /booking` → buat booking
- `POST /payment/confirm` → konfirmasi pembayaran (dengan signature)
- `GET /events` → SSE events
- `GET /booths`, `GET /booths/db` → daftar booth (in-memory / persisted)

Deploy
- Gunakan Dockerfile di `backend/Dockerfile`
- Compose akan mengekspos port 8080 di container ke 3002 host