# Panduan Deployment CI/CD Backoffice App ke DigitalOcean - PijarRupa.com

## 📋 Ringkasan

Dokumentasi ini menjelaskan langkah-langkah lengkap untuk melakukan deployment otomatis aplikasi Backoffice App ke DigitalOcean menggunakan GitHub Actions dengan SSH password (tanpa SSH key) untuk domain **pijarrupa.com**.

## 🏗️ Arsitektur Aplikasi

- **Backend**: Golang HTTP API (port 3002)
- **Frontend**: Preact + SSR (port 5210)
- **Database**: PostgreSQL (Supabase)
- **Cache**: Redis (Upstash)
- **Container**: Docker + Docker Compose

## 🌐 Domain Configuration

### Production Environment

- **Frontend**: `pijarrupa.com` → `localhost:5210`
- **Backend API**: `api.pijarrupa.com` → `localhost:3002`

### Staging Environment

- **Frontend**: `staging.pijarrupa.com` → `localhost:5211`
- **Backend API**: `staging-api.pijarrupa.com` → `localhost:3003`

## 🚀 Prasyarat

### 1. DigitalOcean Droplet

- Ubuntu 22.04 LTS atau lebih baru
- Minimal 2 vCPU, 4GB RAM
- Storage minimal 50GB SSD
- Public IP address

### 2. Software yang Diperlukan di Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose v2
sudo apt install docker-compose-plugin -y

# Install utility tambahan
sudo apt install -y wget curl unzip git
```

### 3. Konfigurasi Firewall

```bash
# Buka port yang diperlukan
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3002/tcp  # Backend API
sudo ufw allow 5210/tcp  # Frontend SSR

# Enable firewall
sudo ufw enable
```

## 🔧 Konfigurasi Server

### 1. Buat User Deployment (Opsional)

```bash
# Buat user khusus untuk deployment
sudo adduser deploy
sudo usermod -aG docker deploy
sudo usermod -aG sudo deploy

# Login sebagai user deploy
su - deploy
```

### 2. Setup Directory Aplikasi

```bash
# Buat directory untuk aplikasi
mkdir -p /home/deploy/backoffice-app
cd /home/deploy/backoffice-app

# Buat directory untuk logs
mkdir -p logs
```

### 3. Install SSH Pass untuk GitHub Actions

```bash
# Install sshpass (untuk SSH password authentication)
sudo apt install -y sshpass
```

### 4. Upload Scripts ke Server (Khusus Repo Private)

Karena repository Anda private, script tidak bisa di-download langsung dari GitHub. Gunakan metode berikut:

#### Metode 1: Upload Manual via SCP

```bash
# Dari local machine ke server
scp backoffice-app/scripts/setup-server.sh deploy@YOUR_SERVER_IP:/home/deploy/
scp backoffice-app/scripts/rollback.sh deploy@YOUR_SERVER_IP:/home/deploy/

# SSH ke server dan jalankan
ssh deploy@YOUR_SERVER_IP
chmod +x setup-server.sh rollback.sh
./setup-server.sh
```

#### Metode 2: Copy-Paste Manual

```bash
# SSH ke server
ssh deploy@YOUR_SERVER_IP

# Buat file setup-server.sh
nano setup-server.sh
# Paste content dari file setup-server.sh
# Save dengan Ctrl+X, Y, Enter

# Buat file rollback.sh
nano rollback.sh
# Paste content dari file rollback.sh
# Save dengan Ctrl+X, Y, Enter

# Jadikan executable
chmod +x setup-server.sh rollback.sh

# Jalankan setup
./setup-server.sh
```

#### Metode 3: Gunakan GitHub Token (Jika mau)

```bash
# Di server, download dengan token
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
     -H "Accept: application/vnd.github.v3.raw" \
     -o setup-server.sh \
     https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/backoffice-app/scripts/setup-server.sh

curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
     -H "Accept: application/vnd.github.v3.raw" \
     -o rollback.sh \
     https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/backoffice-app/scripts/rollback.sh

chmod +x setup-server.sh rollback.sh
./setup-server.sh
```

## 🔐 Konfigurasi GitHub Secrets

Buka repository GitHub → Settings → Secrets and variables → Actions → New repository secret

### Secrets yang Diperlukan:

| Secret Name    | Description                     | Contoh                |
| -------------- | ------------------------------- | --------------------- |
| `DO_HOST`      | IP Address DigitalOcean Droplet | `123.45.67.89`        |
| `DO_USER`      | Username SSH                    | `deploy` atau `root`  |
| `DO_PASSWORD`  | Password SSH user               | `password_user_ssh`   |
| `BACKEND_ENV`  | Isi file .env backend           | Lihat contoh di bawah |
| `FRONTEND_ENV` | Isi file .env frontend          | Lihat contoh di bawah |

### Format BACKEND_ENV:

```
BACKOFFICE_ADDR=:3002
FRONTEND_ORIGIN=http://your-domain.com:5210
BACKOFFICE_JWT_SECRET=your-super-secret-jwt-key-here
PAYMENT_WEBHOOK_SECRET=your-webhook-secret
BACKOFFICE_TLS_CERT=
BACKOFFICE_TLS_KEY=
DATABASE_URL=postgresql://postgres.fmpwdnolddqimaiiitit:jiiancoK123@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres
REDIS_URL=redis://default:AZbPAAIncDI1NjExNzc5NGQ0ZTA0NmViYjdkZTVlYWMxYTNjYWUwYnAyMzg2MDc@actual-sheep-38607.upstash.io:6379
BACKOFFICE_SHUTDOWN_TIMEOUT=10s
BACKOFFICE_READ_TIMEOUT=5s
BACKOFFICE_WRITE_TIMEOUT=10s
BACKOFFICE_IDLE_TIMEOUT=60s
```

### Format FRONTEND_ENV:

```
VITE_API_BASE_URL=http://your-domain.com:3002
VITE_SSE_URL=http://your-domain.com:3002/events
VITE_WS_URL=
VITE_BACKOFFICE_SOCKET_URL=http://your-domain.com:3002
```

## 📝 GitHub Actions Workflow

Buat file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to DigitalOcean

on:
  push:
    branches: [main, develop]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: backoffice-app/frontend/package-lock.json

      - name: Install frontend dependencies
        working-directory: ./backoffice-app/frontend
        run: npm ci

      - name: Run frontend tests
        working-directory: ./backoffice-app/frontend
        run: npm run test

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: "1.24"

      - name: Test backend
        working-directory: ./backoffice-app/backend
        run: |
          go mod download
          go build -v ./...
          go vet ./...

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backoffice-app/backend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./backoffice-app/frontend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          build-args: |
            VITE_API_BASE_URL=${{ secrets.VITE_API_BASE_URL }}
            VITE_SSE_URL=${{ secrets.VITE_SSE_URL }}
            VITE_WS_URL=${{ secrets.VITE_WS_URL }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to DigitalOcean
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USER }}
          password: ${{ secrets.DO_PASSWORD }}
          script: |
            cd /home/deploy/backoffice-app

            # Backup current compose file
            cp docker-compose.yml docker-compose.yml.backup

            # Create new compose file with updated image tags
            cat > docker-compose.yml << 'EOF'
            version: '3.8'

            services:
              backend:
                image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:${{ steps.meta.outputs.tags }}
                container_name: backoffice-backend
                ports:
                  - "3002:3002"
                environment:
                  BACKOFFICE_ADDR: ":3002"
                  FRONTEND_ORIGIN: "http://${{ secrets.DO_HOST }}:5210"
                  BACKOFFICE_JWT_SECRET: "${{ secrets.BACKOFFICE_JWT_SECRET }}"
                  PAYMENT_WEBHOOK_SECRET: "${{ secrets.PAYMENT_WEBHOOK_SECRET }}"
                  BACKOFFICE_TLS_CERT: ""
                  BACKOFFICE_TLS_KEY: ""
                  REDIS_URL: "${{ secrets.REDIS_URL }}"
                  DATABASE_URL: "${{ secrets.DATABASE_URL }}"
                restart: unless-stopped
                healthcheck:
                  test: ["CMD", "wget", "-qO-", "http://localhost:3002/healthz"]
                  interval: 30s
                  timeout: 5s
                  retries: 3
                  start_period: 10s
                
              frontend:
                image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:${{ steps.meta.outputs.tags }}
                container_name: backoffice-frontend
                ports:
                  - "5210:5210"
                environment:
                  NODE_ENV: production
                  PORT: 5210
                restart: unless-stopped
                depends_on:
                  - backend
                healthcheck:
                  test: ["CMD", "wget", "-qO-", "http://localhost:5210"]
                  interval: 30s
                  timeout: 5s
                  retries: 3
                  start_period: 10s
            EOF

            # Pull new images
            docker compose pull

            # Stop old containers
            docker compose down

            # Start new containers
            docker compose up -d

            # Wait for services to be healthy
            sleep 30

            # Check health status
            docker compose ps

            # Clean up old images
            docker image prune -f

            echo "Deployment completed successfully!"
```

## 🚀 Proses Deployment

### 1. Setup Awal Server (One-time)

```bash
# SSH ke server baru
ssh root@YOUR_SERVER_IP

# Download dan jalankan setup script (pilih salah satu metode):

# METODE 1: Upload via SCP (Recommended untuk repo private)
# Dari local machine:
scp backoffice-app/scripts/setup-server.sh root@YOUR_SERVER_IP:/root/
scp backoffice-app/scripts/rollback.sh root@YOUR_SERVER_IP:/root/

# Di server:
chmod +x setup-server.sh rollback.sh
./setup-server.sh

# METODE 2: Copy-paste manual
# SSH ke server, buat file setup-server.sh dan rollback.sh dengan nano
# Paste content dari file tersebut, lalu jalankan

# METODE 3: Gunakan GitHub Token (jika ingin download langsung)
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
     -H "Accept: application/vnd.github.v3.raw" \
     -o setup-server.sh \
     https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/backoffice-app/scripts/setup-server.sh

chmod +x setup-server.sh
./setup-server.sh
```

### 2. Manual Deployment

```bash
# Push ke branch main
git push origin main

# Atau trigger manual dari GitHub Actions tab
```

### 3. Automated Deployment

- Setiap push ke branch `main` akan trigger deployment otomatis
- Workflow akan menjalankan test terlebih dahulu
- Jika test berhasil, akan build dan push Docker images
- Terakhir, deploy ke DigitalOcean menggunakan SSH password

## 🔍 Monitoring dan Debugging

### 1. Cek Status Container

```bash
# Lihat status semua container
docker compose ps

# Lihat logs container
docker compose logs -f backend
docker compose logs -f frontend

# Lihat resource usage
docker stats
```

### 2. Health Check

```bash
# Cek backend health
curl http://localhost:3002/healthz

# Cek frontend
curl http://localhost:5210

# Cek logs deployment
tail -f /home/deploy/backoffice-app/logs/deploy.log
```

### 3. Troubleshooting Common Issues

#### Container tidak start

```bash
# Cek detailed error
docker compose logs backend
docker compose logs frontend

# Restart container
docker compose restart backend
docker compose restart frontend
```

#### Port conflict

```bash
# Cek port yang digunakan
sudo netstat -tlnp | grep :3002
sudo netstat -tlnp | grep :5210

# Kill process yang menggunakan port
sudo kill -9 <PID>
```

#### Memory issues

```bash
# Cek memory usage
free -h
docker stats --no-stream

# Increase swap jika perlu
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 🔄 Rollback Strategy

### 1. Quick Rollback (Previous Image)

```bash
# Lihat image yang tersedia
docker images | grep backoffice

# Edit docker-compose.yml untuk menggunakan image tag sebelumnya
# Contoh: ubah tag dari latest ke main-sha-hash-sebelumnya

# Redeploy
docker compose down
docker compose pull
docker compose up -d
```

### 2. Full Rollback (Backup Compose)

```bash
# Kembalikan ke compose file backup
cp docker-compose.yml.backup docker-compose.yml

# Redeploy
docker compose down
docker compose up -d
```

### 3. Emergency Rollback

```bash
# Stop semua services
docker compose down

# Restore dari backup jika ada
# atau gunakan image yang diketahui stabil
docker run -d --name backoffice-backend-backup \
  -p 3002:3002 \
  -e BACKOFFICE_ADDR=:3002 \
  ghcr.io/your-repo/backend:stable-tag

docker run -d --name backoffice-frontend-backup \
  -p 5210:5210 \
  -e NODE_ENV=production \
  -e PORT=5210 \
  ghcr.io/your-repo/frontend:stable-tag
```

## 🛡️ Keamanan

### 1. SSH Security

```bash
# Gunakan password yang kuat
# Batasi akses SSH hanya dari IP tertentu (opsional)
sudo ufw allow from YOUR_IP to any port 22

# Disable password authentication setelah setup (opsional)
# Edit /etc/ssh/sshd_config
# PasswordAuthentication no
# PubkeyAuthentication yes
```

### 2. Container Security

```bash
# Jalankan container sebagai non-root user (sudah dikonfigurasi di Dockerfile)
# Gunakan image yang minimal (alpine, distroless)
# Regular security updates
sudo apt update && sudo apt upgrade -y
```

### 3. Network Security

```bash
# Gunakan reverse proxy (nginx) untuk production
# Setup SSL/TLS dengan Let's Encrypt
# Rate limiting di nginx
```

## 📊 Performance Optimization

### 1. Docker Optimization

```bash
# Set resource limits di docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 2. Application Optimization

```bash
# Enable Gzip compression di nginx
# Setup Redis caching
# Database connection pooling
# Monitor dengan Prometheus/Grafana (opsional)
```

## 🧪 Testing di Production

### 1. Staging Environment

```bash
# Setup staging terpisah
# Gunakan database dan Redis yang berbeda
# Test deployment ke staging terlebih dahulu
```

### 2. Blue-Green Deployment

```bash
# Setup dua environment (blue/green)
# Switch traffic menggunakan load balancer
# Zero downtime deployment
```

## 📝 Checklist Pre-Deployment

- [ ] Semua GitHub secrets sudah terisi dengan benar
- [ ] Docker Compose file sudah tervalidasi
- [ ] Firewall sudah dikonfigurasi
- [ ] Database dan Redis sudah accessible
- [ ] Health check endpoint berfungsi
- [ ] Backup strategy sudah ada
- [ ] Monitoring sudah setup
- [ ] SSL certificate sudah terinstall (jika menggunakan HTTPS)

## 🆘 Emergency Contacts

- **Server Admin**: [Contact Info]
- **Database Admin**: [Contact Info]
- **DevOps Team**: [Contact Info]

---

📝 **Catatan**: Dokumentasi ini akan terus diupdate sesuai dengan kebutuhan dan perubahan infrastruktur.
