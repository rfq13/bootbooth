# Migrasi & Seeding Database (Backend Go)

## Prasyarat
- Siapkan `DATABASE_URL` Postgres (gunakan DSN dari Supabase, port pooler/pgbouncer). 
- Supabase sudah menyediakan pooling: backend Go ini menonaktifkan pooling internal (`MaxOpenConns=1`, `MaxIdleConns=0`).

## Struktur
- `backend/migrations` berisi file migrasi versi: `0001_init.up.sql`, `0001_init.down.sql`.
- `backend/seeds` berisi seed per environment: `dev.sql`, `staging.sql`, `prod.sql`.

## Perintah CLI

### Migrasi
```
go run ./backend/cmd/migrate -db "$env:DATABASE_URL" -up
go run ./backend/cmd/migrate -db "$env:DATABASE_URL" -down
```
Opsional: `-dir backend/migrations`, `-force <version>`.

### Seeding
```
go run ./backend/cmd/seed -db "$env:DATABASE_URL" -env dev
```
Opsional: `-dir backend/seeds`.

## CI/CD
- Jalankan `migrate -up` pada deploy sebelum start aplikasi.
- Jalankan `seed -env staging` atau `prod` sesuai kebutuhan non-destruktif.

## Verifikasi
- Dari DB kosong: jalankan `migrate -up` → tabel terbentuk.
- Rollback: jalankan `migrate -down` → versi turun satu langkah.
- Seeding: jalankan `seed -env dev` → data dummy masuk.
- Pooling: pastikan `DATABASE_URL` Supabase pooler dan cek bahwa backend tidak membuat pool (`MaxOpenConns=1`, `MaxIdleConns=0`).