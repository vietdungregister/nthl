#!/bin/bash
# ============================================================================
# server-deploy.sh — One-click server deploy script
# 
# USAGE:
#   ssh root@SERVER_IP 'bash -s' < scripts/server-deploy.sh
#   hoặc: upload lên server rồi chạy: bash ~/server-deploy.sh
#
# PREREQUISITE:
#   - nthl_full.dump đã upload vào ~/
#   - nthl_uploads.tar.gz đã upload vào ~/ (optional nếu chỉ update code)
#   - Docker image mới đã push lên Docker Hub
#
# VARIABLES: Sửa 7 biến dưới đây trước khi chạy
# ============================================================================

# ── CONFIG ───────────────────────────────────────────────────────────────────
SERVER_IP="188.166.177.93"
DOCKER_IMAGE="vietdungregister/nthl:v4"     # ← Đổi tag mỗi lần deploy
OLD_IMAGE_PATTERN="vietdungregister/nthl"    # Regex cho sed
PROJECT_PATH="/app"                          # Path trên server
DB_CONTAINER="vibe-db"
APP_CONTAINER="vibe-app"
DB_USER="vibe_user"
DB_NAME="vibe_db"
SWAP_SIZE="2G"
# ─────────────────────────────────────────────────────────────────────────────

set -e
echo "=============================="
echo "  NTHL Server Deploy"
echo "  Image: $DOCKER_IMAGE"
echo "=============================="

# ── [1/7] SWAP ───────────────────────────────────────────────────────────────
echo ""
echo "⏳ [1/7] Kiểm tra swap..."
if ! swapon --show | grep -q swapfile; then
  if [ ! -f /swapfile ]; then
    fallocate -l $SWAP_SIZE /swapfile && chmod 600 /swapfile && mkswap /swapfile
    echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
  fi
  swapon /swapfile 2>/dev/null || true
  echo "✅ Swap $SWAP_SIZE activated"
else
  echo "✅ Swap already active"
fi
free -h | grep Swap

# ── [2/7] DOCKER PULL ────────────────────────────────────────────────────────
echo ""
echo "⏳ [2/7] Pull Docker image..."
docker pull "$DOCKER_IMAGE"
echo "✅ Image pulled"

# ── [3/7] UPDATE COMPOSE ─────────────────────────────────────────────────────
echo ""
echo "⏳ [3/7] Update docker-compose.yml..."
cd "$PROJECT_PATH"

# Đổi app image (match bất kỳ tag nào)
sed -i "s|image: ${OLD_IMAGE_PATTERN}:v[0-9]*|image: ${DOCKER_IMAGE}|g" docker-compose.yml
# Đảm bảo dùng pgvector
sed -i 's|image: postgres:16-alpine|image: pgvector/pgvector:pg16|g' docker-compose.yml
# Fallback: đổi image cũ kiểu vibe-app:vN
sed -i "s|image: vibe-app:v[0-9]*|image: ${DOCKER_IMAGE}|g" docker-compose.yml

echo "Images in compose:"
grep "image:" docker-compose.yml

# ── [4/7] RESTART CONTAINERS ─────────────────────────────────────────────────
echo ""
echo "⏳ [4/7] Restart containers..."
docker compose down
docker compose up -d
echo "Chờ 15s cho containers khởi động..."
sleep 15
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

# ── [5/7] RESTORE DATABASE ───────────────────────────────────────────────────
if [ -f ~/nthl_full.dump ]; then
  echo ""
  echo "⏳ [5/7] Restore database..."

  # Enable pgvector
  docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME \
    -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || true

  # Copy & restore
  docker cp ~/nthl_full.dump $DB_CONTAINER:/tmp/nthl_full.dump
  echo "Restoring (có thể mất 5-10 phút)..."
  docker exec $DB_CONTAINER pg_restore -U $DB_USER -d $DB_NAME \
    --clean --if-exists --no-owner --no-privileges \
    /tmp/nthl_full.dump || echo "⚠️ pg_restore có warnings (thường do DROP trên bảng không tồn tại — bỏ qua được)"

  # Chạy migrations
  docker exec $APP_CONTAINER npx prisma migrate deploy 2>/dev/null || \
    echo "⚠️ Prisma migrate skipped (schema đã up-to-date hoặc version mismatch)"

  # Optimize PG cho 2GB RAM
  docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
    ALTER SYSTEM SET shared_buffers = '256MB';
    ALTER SYSTEM SET work_mem = '8MB';
    ALTER SYSTEM SET maintenance_work_mem = '128MB';
    ALTER SYSTEM SET effective_cache_size = '1GB';
    SELECT pg_reload_conf();
  " 2>/dev/null || true

  # Cleanup
  docker exec $DB_CONTAINER rm -f /tmp/nthl_full.dump
  rm -f ~/nthl_full.dump
  echo "✅ Database restored"
else
  echo ""
  echo "⏯️  [5/7] Skip DB restore (no dump file found)"
fi

# ── [6/7] RESTORE MEDIA ──────────────────────────────────────────────────────
if [ -f ~/nthl_uploads.tar.gz ]; then
  echo ""
  echo "⏳ [6/7] Restore media uploads..."

  UPLOAD_VOL=$(docker inspect $APP_CONTAINER \
    --format '{{ range .Mounts }}{{ if eq .Destination "/app/public/uploads" }}{{ .Source }}{{ end }}{{ end }}')

  if [ -n "$UPLOAD_VOL" ]; then
    echo "Volume path: $UPLOAD_VOL"
    tar xzf ~/nthl_uploads.tar.gz -C "$UPLOAD_VOL"/ || \
      echo "⚠️ tar có lỗi (có thể do disk đầy — kiểm tra df -h)"
  else
    echo "⚠️ Không tìm thấy volume path — dùng docker cp thay thế"
    docker cp ~/nthl_uploads.tar.gz $APP_CONTAINER:/tmp/uploads.tar.gz
    docker exec $APP_CONTAINER tar xzf /tmp/uploads.tar.gz -C /app/public/uploads/
    docker exec $APP_CONTAINER rm -f /tmp/uploads.tar.gz
  fi

  rm -f ~/nthl_uploads.tar.gz
  echo "✅ Media restored"
else
  echo ""
  echo "⏯️  [6/7] Skip media restore (no archive found)"
fi

# ── [7/7] CLEANUP & VERIFY ───────────────────────────────────────────────────
echo ""
echo "⏳ [7/7] Cleanup old images & verify..."

# Xóa images cũ không dùng
docker image prune -f 2>/dev/null || true

echo ""
echo "=============================="
echo "  📊 VERIFICATION"
echo "=============================="

# Data counts
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
  SELECT 'works' AS entity, COUNT(*) FROM \"Work\"
  UNION ALL SELECT 'chunks', COUNT(*) FROM \"ChatChunk\"
  UNION ALL SELECT 'tags', COUNT(*) FROM \"Tag\";
" 2>/dev/null || echo "DB query failed"

# Web health
echo ""
curl -s -o /dev/null -w "Homepage: HTTP %{http_code}\n" http://localhost:3001/ || true
curl -s -o /dev/null -w "Works:    HTTP %{http_code}\n" http://localhost:3001/tac-pham || true

# System
echo ""
echo "Disk:  $(df -h / | tail -1 | awk '{print $4 " free (" $5 " used)"}')"
echo "RAM:   $(free -h | grep Mem | awk '{print $3 "/" $2 " used"}')"
echo "Swap:  $(free -h | grep Swap | awk '{print $3 "/" $2 " used"}')"

echo ""
echo "=============================="
echo "  🚀 DEPLOY COMPLETE!"
echo "  URL: http://${SERVER_IP}:3001/"
echo "  CMS: http://${SERVER_IP}:3001/cms/login"
echo "=============================="
