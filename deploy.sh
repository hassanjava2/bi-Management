#!/bin/bash
############################################################
# BI Management - Hostinger VPS Deployment Script
# Run this script on your VPS after connecting via SSH:
#   ssh -p 65002 u407483935_AJnMDbhZV@72.62.144.138
#
# Usage: bash deploy.sh
############################################################

set -e

echo "=============================================="
echo "  BI Management - VPS Deployment"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[X]${NC} $1"; }

############################################################
# Step 1: Update System
############################################################
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

############################################################
# Step 2: Install Node.js 20 LTS
############################################################
if ! command -v node &> /dev/null; then
    log "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    log "Node.js already installed: $(node -v)"
fi

############################################################
# Step 3: Install PM2 (Process Manager)
############################################################
if ! command -v pm2 &> /dev/null; then
    log "Installing PM2..."
    sudo npm install -g pm2
else
    log "PM2 already installed"
fi

############################################################
# Step 4: Install Nginx
############################################################
if ! command -v nginx &> /dev/null; then
    log "Installing Nginx..."
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
else
    log "Nginx already installed"
fi

############################################################
# Step 5: Install Git
############################################################
if ! command -v git &> /dev/null; then
    log "Installing Git..."
    sudo apt install -y git
else
    log "Git already installed"
fi

############################################################
# Step 6: Clone Project
############################################################
APP_DIR="/var/www/bi-management"

if [ -d "$APP_DIR" ]; then
    warn "Project directory exists. Pulling latest..."
    cd "$APP_DIR"
    git pull origin main
else
    log "Cloning project..."
    sudo mkdir -p /var/www
    sudo chown $USER:$USER /var/www
    git clone https://github.com/hassanjava2/bi-Management.git "$APP_DIR"
    cd "$APP_DIR"
fi

############################################################
# Step 7: Setup Backend
############################################################
log "Setting up Backend..."
cd "$APP_DIR/backend"
npm install --production

# Create .env if not exists
if [ ! -f .env ]; then
    log "Creating backend .env file..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    cat > .env << ENVEOF
NODE_ENV=production
PORT=3000
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
MASTER_KEY=$MASTER_KEY
CORS_ORIGIN=*
ENVEOF
    
    log "Backend .env created with secure random keys"
else
    log "Backend .env already exists"
fi

# Initialize database
log "Initializing database..."
npm run db:init 2>/dev/null || log "Database already initialized or init script not available"

############################################################
# Step 8: Build Frontend
############################################################
log "Building Frontend..."
cd "$APP_DIR/frontend"
npm install
npm run build

# Copy build to nginx serve directory
sudo mkdir -p /var/www/bi-management-web
sudo cp -r dist/* /var/www/bi-management-web/
log "Frontend built and copied to /var/www/bi-management-web/"

############################################################
# Step 9: Configure Nginx
############################################################
log "Configuring Nginx..."

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "72.62.144.138")

sudo tee /etc/nginx/sites-available/bi-management > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    # Frontend - React App
    root /var/www/bi-management-web;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # API - Proxy to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # WebSocket - Socket.io
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # React Router - SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINXEOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/bi-management /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart nginx
sudo nginx -t && sudo systemctl restart nginx
log "Nginx configured and restarted"

############################################################
# Step 10: Start Backend with PM2
############################################################
log "Starting Backend with PM2..."
cd "$APP_DIR/backend"

# Stop existing if any
pm2 delete bi-api 2>/dev/null || true

# Start with PM2
pm2 start src/app.js --name "bi-api" --env production \
    --max-memory-restart 512M \
    --time

# Save PM2 config and setup auto-start on reboot
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true

############################################################
# Step 11: Setup Firewall
############################################################
log "Configuring firewall..."
sudo ufw allow 22/tcp    2>/dev/null || true
sudo ufw allow 65002/tcp 2>/dev/null || true
sudo ufw allow 80/tcp    2>/dev/null || true
sudo ufw allow 443/tcp   2>/dev/null || true
sudo ufw --force enable  2>/dev/null || true

############################################################
# Done!
############################################################
echo ""
echo "=============================================="
echo -e "${GREEN}  DEPLOYMENT COMPLETE!${NC}"
echo "=============================================="
echo ""
echo "  Frontend: http://$SERVER_IP"
echo "  API:      http://$SERVER_IP/api/health"
echo ""
echo "  Login Credentials:"
echo "    Username: admin"
echo "    Password: Admin@123"
echo ""
echo "  Useful PM2 Commands:"
echo "    pm2 status        - Check status"
echo "    pm2 logs bi-api   - View logs"
echo "    pm2 restart bi-api - Restart"
echo "    pm2 monit         - Monitor"
echo ""
echo "  Update Project:"
echo "    cd $APP_DIR && git pull"
echo "    cd backend && npm install"
echo "    cd ../frontend && npm install && npm run build"
echo "    sudo cp -r dist/* /var/www/bi-management-web/"
echo "    pm2 restart bi-api"
echo ""
echo "=============================================="
