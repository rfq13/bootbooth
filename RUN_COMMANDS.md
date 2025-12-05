Backend (Go)

```
cd backoffice-app/backend
cp .env.example .env
export DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | sed -e 's/^DATABASE_URL=//')
go run ./cmd/migrate -up -dir ./migrations
go run ./cmd/seed -env dev -dir ./seeds
go run ./cmd/server
```

Frontend (Vite React)

```
cd backoffice-app/frontend
npm install
npm run dev
```

Frontend (Build & Preview)

```
cd backoffice-app/frontend
npm run build
npm run preview
```

Rust

```
cd backoffice-app/rust
cp .env.example .env
cargo build
cargo bench
```

Docker (Dev)

```
docker-compose up -d
```

Docker (Prod)

```
docker-compose -f docker-compose.production.yml up -d
```

Tests

```
cd backoffice-app/frontend && npm run typecheck && npm run test
cd backoffice-app/backend && go build ./...
```

Bootstrap Super Admin (opsional)

```
curl -X POST http://localhost:8080/auth/bootstrap-superadmin \
  -H "Content-Type: application/json" \
  -d '{"token":"<BOOTSTRAP_TOKEN>","email":"superadmin@example.com","password":"<password>"}'
```
