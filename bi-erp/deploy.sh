#!/bin/bash
#
# BI ERP - Auto Deploy Script v2.0
# Usage: cd /var/www/bi-management && bash bi-erp/deploy.sh
#

set -e

echo "=========================================="
echo "  BI ERP - Auto Deploy v2.0"
echo "=========================================="

PROJECT_DIR="/var/www/bi-management"
FRONTEND_SRC="$PROJECT_DIR/bi-erp/frontend/dist"
FRONTEND_DEST="/var/www/bi-erp-web"

# [1/6] Backup
echo "[1/6] Creating backup..."
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$FRONTEND_DEST" "$BACKUP_DIR/frontend-backup" 2>/dev/null || true
echo "  → Backup saved to $BACKUP_DIR"

# [2/6] Pull latest
echo "[2/6] Pulling latest changes..."
cd "$PROJECT_DIR"
git pull origin main

# [3/6] Install backend dependencies (if changed)
echo "[3/6] Checking backend dependencies..."
cd "$PROJECT_DIR/bi-erp/backend"
npm install --production --silent 2>/dev/null || npm install --production

# [4/6] Run database migrations
echo "[4/6] Running database migrations..."
cd "$PROJECT_DIR/bi-erp"
node database/migrate.js 2>/dev/null || echo "  [!] Migration skipped or already up to date"

# [5/6] Build frontend
echo "[5/6] Building frontend..."
cd "$PROJECT_DIR/bi-erp/frontend"
npm run build

# [6/6] Deploy
echo "[6/6] Deploying..."
rm -rf "$FRONTEND_DEST"/*
cp -r "$FRONTEND_SRC"/* "$FRONTEND_DEST"/

# Restart backend
pm2 restart bi-erp-api --update-env
sleep 2

echo ""
echo "=========================================="
echo "  ✅ Deploy complete!"
echo "=========================================="
pm2 status

# Health check
echo ""
echo "  Health check..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✅ API is healthy (HTTP 200)"
else
  echo "  ⚠️  API returned HTTP $HTTP_CODE — check pm2 logs"
fi
