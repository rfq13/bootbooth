#!/bin/bash

# Setup Script for DigitalOcean Server
# Usage: curl -sSL https://raw.githubusercontent.com/your-repo/scripts/setup-server.sh | bash

set -e

echo "🚀 Starting DigitalOcean Server Setup for Backoffice App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root!"
   echo "Please run as a regular user with sudo privileges."
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y curl wget unzip git software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_status "Docker installed successfully"
else
    print_warning "Docker is already installed"
fi

# Install Docker Compose
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    sudo apt install -y docker-compose-plugin
    print_status "Docker Compose installed successfully"
else
    print_warning "Docker Compose is already installed"
fi

# Install SSH Pass for GitHub Actions
print_status "Installing sshpass..."
sudo apt install -y sshpass

# Create deploy user
print_status "Creating deploy user..."
if ! id "deploy" &>/dev/null; then
    sudo adduser --disabled-password --gecos '' deploy
    sudo usermod -aG docker deploy
    sudo usermod -aG sudo deploy
    
    # Set password for deploy user (you'll be prompted to enter)
    print_status "Setting password for deploy user..."
    sudo passwd deploy
    
    print_status "Deploy user created successfully"
else
    print_warning "Deploy user already exists"
fi

# Create application directory
print_status "Creating application directories..."
sudo -u deploy mkdir -p /home/deploy/backoffice-app
sudo -u deploy mkdir -p /home/deploy/backoffice-app/logs
sudo -u deploy mkdir -p /home/deploy/backoffice-app-staging
sudo -u deploy mkdir -p /home/deploy/backoffice-app-staging/logs

# Setup firewall
print_status "Configuring firewall..."
sudo ufw --force reset
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3002/tcp  # Backend API
sudo ufw allow 3003/tcp  # Backend API Staging
sudo ufw allow 5210/tcp  # Frontend SSR
sudo ufw allow 5211/tcp  # Frontend SSR Staging

# Enable firewall
print_status "Enabling firewall..."
sudo ufw --force enable

# Install Nginx for reverse proxy (optional but recommended)
print_status "Installing Nginx..."
sudo apt install -y nginx

# Create Nginx configuration for pijarrupa.com
print_status "Creating Nginx configuration for pijarrupa.com..."
sudo tee /etc/nginx/sites-available/pijarrupa.com << 'EOF'
server {
    listen 80;
    server_name pijarrupa.com www.pijarrupa.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5210;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API routes
    location ~ ^/(healthz|auth|booking|payment|session|outlets|admin-users|config|events|socket\.io/) {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Create Nginx configuration for api.pijarrupa.com
sudo tee /etc/nginx/sites-available/api.pijarrupa.com << 'EOF'
server {
    listen 80;
    server_name api.pijarrupa.com;

    # Backend API - all routes
    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Create Nginx configuration for staging
sudo tee /etc/nginx/sites-available/staging.pijarrupa.com << 'EOF'
server {
    listen 80;
    server_name staging.pijarrupa.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5211;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API routes
    location ~ ^/(healthz|auth|booking|payment|session|outlets|admin-users|config|events|socket\.io/) {
        proxy_pass http://localhost:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Create Nginx configuration for staging API
sudo tee /etc/nginx/sites-available/staging-api.pijarrupa.com << 'EOF'
server {
    listen 80;
    server_name staging-api.pijarrupa.com;

    # Backend API - all routes
    location / {
        proxy_pass http://localhost:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Enable production sites
sudo ln -sf /etc/nginx/sites-available/pijarrupa.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api.pijarrupa.com /etc/nginx/sites-enabled/

# Remove default Nginx site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Create Docker daemon configuration for better performance
print_status "Optimizing Docker configuration..."
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
EOF

# Restart Docker to apply configuration
sudo systemctl restart docker
sudo systemctl enable docker

# Create monitoring script
print_status "Creating monitoring script..."
sudo tee /usr/local/bin/backoffice-monitor.sh << 'EOF'
#!/bin/bash

# Monitoring script for Backoffice App
LOG_FILE="/home/deploy/backoffice-app/logs/monitor.log"

check_service() {
    local service_name=$1
    local port=$2
    local container_name=$3
    
    if curl -f -s http://localhost:$port/healthz > /dev/null 2>&1; then
        echo "$(date): $service_name is healthy" >> $LOG_FILE
        return 0
    else
        echo "$(date): $service_name is unhealthy - restarting container" >> $LOG_FILE
        docker restart $container_name
        return 1
    fi
}

# Check production services
check_service "Backend Production" 3002 "backoffice-backend"
check_service "Frontend Production" 5210 "backoffice-frontend"

# Check staging services (if they exist)
if docker ps | grep -q backoffice-backend-staging; then
    check_service "Backend Staging" 3003 "backoffice-backend-staging"
fi

if docker ps | grep -q backoffice-frontend-staging; then
    check_service "Frontend Staging" 5211 "backoffice-frontend-staging"
fi
EOF

sudo chmod +x /usr/local/bin/backoffice-monitor.sh

# Create cron job for monitoring
print_status "Setting up monitoring cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/backoffice-monitor.sh") | crontab -

# Create backup script
print_status "Creating backup script..."
sudo tee /usr/local/bin/backoffice-backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup Docker Compose files
cp /home/deploy/backoffice-app/docker-compose.yml $BACKUP_DIR/docker-compose-prod-$DATE.yml
cp /home/deploy/backoffice-app-staging/docker-compose.yml $BACKUP_DIR/docker-compose-staging-$DATE.yml 2>/dev/null || true

# Backup environment files
cp /home/deploy/backoffice-app/.env* $BACKUP_DIR/ 2>/dev/null || true
cp /home/deploy/backoffice-app-staging/.env* $BACKUP_DIR/ 2>/dev/null || true

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.yml" -mtime +7 -delete
find $BACKUP_DIR -name ".env*" -mtime +7 -delete

echo "$(date): Backup completed" >> /home/deploy/backoffice-app/logs/backup.log
EOF

sudo chmod +x /usr/local/bin/backoffice-backup.sh

# Create cron job for daily backup
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backoffice-backup.sh") | crontab -

# Print server information
print_status "Server setup completed for pijarrupa.com!"
echo ""
echo "📋 Server Information:"
echo "  - IP Address: $(curl -s ifconfig.me)"
echo "  - Docker Version: $(docker --version)"
echo "  - Docker Compose Version: $(docker compose version)"
echo "  - Nginx Version: $(nginx -v 2>&1)"
echo ""
echo "🌐 Domain Configuration:"
echo "  - Frontend: pijarrupa.com"
echo "  - Backend API: api.pijarrupa.com"
echo "  - Staging Frontend: staging.pijarrupa.com"
echo "  - Staging API: staging-api.pijarrupa.com"
echo ""
echo "🔧 Next Steps:"
echo "  1. Point your domains to this server IP:"
echo "     - pijarrupa.com → $(curl -s ifconfig.me)"
echo "     - api.pijarrupa.com → $(curl -s ifconfig.me)"
echo "     - staging.pijarrupa.com → $(curl -s ifconfig.me)"
echo "     - staging-api.pijarrupa.com → $(curl -s ifconfig.me)"
echo ""
echo "  2. Setup SSL with Let's Encrypt:"
echo "     sudo apt install certbot python3-certbot-nginx"
echo "     sudo certbot --nginx -d pijarrupa.com -d api.pijarrupa.com"
echo "     sudo certbot --nginx -d staging.pijarrupa.com -d staging-api.pijarrupa.com"
echo ""
echo "  3. Configure GitHub Secrets in your repository:"
echo "     - DO_HOST: $(curl -s ifconfig.me)"
echo "     - DO_USER: deploy"
echo "     - DO_PASSWORD: [your SSH password]"
echo "     - BACKEND_ENV: [backend environment variables]"
echo "     - FRONTEND_ENV: [frontend environment variables]"
echo ""
echo "  4. Test deployment by pushing to main branch"
echo ""
echo "📁 Important Paths:"
echo "  - Production App: /home/deploy/backoffice-app"
echo "  - Staging App: /home/deploy/backoffice-app-staging"
echo "  - Logs: /home/deploy/backoffice-app/logs"
echo "  - Backups: /home/deploy/backups"
echo "  - Nginx Config: /etc/nginx/sites-available/"
echo ""
echo "🔍 Useful Commands:"
echo "  - Check containers: docker compose ps"
echo "  - View logs: docker compose logs -f"
echo "  - Monitor: tail -f /home/deploy/backoffice-app/logs/monitor.log"
echo "  - Backup: /usr/local/bin/backoffice-backup.sh"
echo "  - Nginx test: sudo nginx -t"
echo "  - Nginx reload: sudo systemctl reload nginx"
echo ""
print_status "Setup completed successfully! Please logout and login again to apply group changes."