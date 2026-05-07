#!/bin/bash
set -e

APP_NAME="city-forms"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "=== City Forms Deploy ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"
echo ""

cd "$PROJECT_ROOT"

# 1. Pull
echo "[1/3] git pull..."
GIT_OUT=$(git pull 2>&1)
echo "$GIT_OUT"

# 2. npm ci only if package files changed
echo ""
if echo "$GIT_OUT" | grep -q "package"; then
    echo "[2/3] Dependencies changed — running npm ci..."
    npm ci --omit=dev
else
    echo "[2/3] No dependency changes — skipping npm ci."
fi

# 3. Zero-downtime reload (new process claims port before old one releases it)
echo ""
echo "[3/3] Reloading via PM2..."
pm2 reload "$APP_NAME" --update-env

pm2 save
echo ""
echo "=== Deploy complete ==="
echo ""
pm2 show "$APP_NAME"
