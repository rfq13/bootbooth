# Backoffice Booth — PRD Final

## 1. Ringkasan
- Sistem backoffice untuk operasional Photo Booth: booking, pembayaran, sesi, override, dan panel super admin.
- Arsitektur: Backend Golang (HTTP API), Frontend Preact (SSR), WS hub (planned), modul Rust untuk utilitas/perf.

## 2. Tujuan
- Mendukung event dengan banyak booth secara real-time.
- Memastikan flow kedatangan → mulai → selesai berjalan konsisten dan dapat diawasi admin.

## 3. Fitur Utama
- Booking dan status sesi (AWAITING_CUSTOMER, ARRIVED, ONGOING, DONE, EXPIRED, OVERRIDDEN).
- Pembayaran dan webhook konfirmasi.
- Kedatangan (arrival), mulai (start), selesai (finish) sesi.
- Override oleh admin jika terjadi error di lapangan.
- System Config (durasi sesi dan toleransi keterlambatan) — khusus Super Admin.

## 4. API (Ringkas)
- `GET /healthz`
- `POST /booking`
- `POST /payment/confirm`
- `POST /session/{id}/arrival`
- `POST /session/{id}/start`
- `POST /session/{id}/finish`
- `POST /session/{id}/override`
- `GET /session/{id}/status`
- `GET /outlets`
- `GET /admin-users`
- `GET /bookings?status=`
- `GET /config/system` (Super Admin)
- `PUT /config/system` (Super Admin)

Catatan: Spesifikasi detail tersedia di `backend/openapi.yaml`.

## 5. Data Model (Ringkas)
- bookings: id, user, outlet_id, status, booking_time, paid_at, expired_at, override_by, override_at.
- payments: id, booking_id, status, raw_jsonb.
- outlets: id, name, location.
- admin_users: id, name, role (`admin` | `super_admin`), outlet_id (opsional).
- system_config: session_duration_minutes, arrival_tolerance_minutes.

## 6. Frontend (Backoffice)
- Preact + React Router DOM (SSR + CSR parity).
- Halaman: Login, Dashboard (WS events), Bookings, Outlets (Super Admin), Admin Users (Super Admin), Override, System Config (Super Admin).
- RBAC di routing dan Sidebar.

## 7. Alur Proses
- Booking dibuat → status awal `PENDING_PAYMENT` atau `PAID`.
- Setelah konfirmasi pembayaran, status menjadi `AWAITING_CUSTOMER`.
- Customer datang (`arrival`) → status `ARRIVED` jika dalam toleransi, jika lewat toleransi bisa `EXPIRED`.
- Booth mulai (`start`) → status `ONGOING`, kemudian `DONE` ketika selesai.
- Admin dapat `override` status jika terjadi masalah.

## 8. Konfigurasi Sistem
- `session_duration_minutes`: durasi standar sesi.
- `arrival_tolerance_minutes`: toleransi keterlambatan.
- Dapat diubah via `PUT /config/system` oleh Super Admin.

## 9. WebSocket (Planned)
- Event real-time: `SESSION_APPROVED`, `SESSION_REJECTED`, `SESSION_EXPIRED`, `SESSION_OVERRIDE`.
- Koneksi otomatis retry di client; target latency < 200ms.

## 10. Keamanan
- HTTPS / WSS hanya.
- UUID untuk session IDs.
- Validasi signature webhook pembayaran.
- Booth hanya konsumsi endpoint yang diizinkan.
- Rate limit API tertentu (scan/arrival).
- Role-based ACL (Admin vs Super Admin).

## 11. Non-Fungsional
- WS Latency: < 200ms.
- Webhook Processing: < 50ms.
- Support Booth: 500+ secara simultan.
- Availability: 99.9%.
- Queue retry: 5 kali.

## 12. Milestone
- Phase 1: Booking API, Payment webhook, QR system.
- Phase 2: WebSocket hub, Arrival → Start flow, Durasi sesi.
- Phase 3: Toleransi 15 menit, Hangus logic, Admin override.
- Phase 4: Super admin panel, Scaling & hardening, Load test 100+ booth.

## 13. Catatan Implementasi
- Backend: Golang HTTP server, middleware logging, rate limit, CORS; repository sementara in-memory.
- Frontend: SSR server Node, routes parity, RBAC di `AppClient.tsx` dan `AppServer.tsx`, Sidebar tersembunyi sesuai role.
- Rust: utilitas kinerja; benchmark tersedia.

## 14. Selesai
- PRD Final lengkap; pengembangan mengikuti milestone di atas.