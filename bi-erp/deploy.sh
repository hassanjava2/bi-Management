#!/bin/bash
# BI ERP - Auto Deploy Script
# Usage: ./deploy.sh  (run on server)

set -e

echo "=========================================="
echo "  BI ERP - Auto Deploy"
echo "=========================================="

PROJECT_DIR="/var/www/bi-management"
FRONTEND_DIR="$PROJECT_DIR/bi-erp/frontend"
BACKEND_DIR="$PROJECT_DIR/bi-erp/backend"
WEB_DIR="/var/www/bi-erp-web"

# 1. Pull latest changes
echo "[1/4] Pulling latest changes..."
cd "$PROJECT_DIR"
git pull

# 2. Build frontend
echo "[2/4] Building frontend..."
cd "$FRONTEND_DIR"
npm run build

# 3. Copy to Nginx web root
echo "[3/4] Deploying frontend to $WEB_DIR..."
cp -r "$FRONTEND_DIR/dist/"* "$WEB_DIR/"

# 4. Restart backend
echo "[4/4] Restarting backend..."
pm2 restart bi-erp-api

echo ""
echo "=========================================="
echo "  ✅ Deploy complete!"
echo "=========================================="
pm2 status
