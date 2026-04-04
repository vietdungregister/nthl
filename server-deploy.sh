#!/bin/bash
# ============================================================
# server-deploy.sh — Chạy trên server sau khi upload xong
# Usage: bash server-deploy.sh
# ============================================================
set -e

echo "=============================="
echo "  NTHL Server Deploy Script"
echo "=============================="

# ── [1] Swap ──────────────────────────────────────────────
echo ""
echo "⏳ [1/7] Kiểm tra/thêm swap 2GB..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
  echo "✅ Swap 2GB đã thêm"
else
  echo "✅ Swap đã tồn tại, skip"
fi
free -h | grep -E "Mem|Swap"

# ── [2] Disk check ────────────────────────────────────────
echo ""
echo "⏳ [2/7] Disk usage..."
df -h /

# ── [3] Git pull + update docker-compose ─────────────────
echo ""
echo "⏳ [3/7] Git pull + cập nhật docker-compose..."
cd ~/nthl
git pull origin master

# Đổi image name trong docker-compose.yml
sed -i 's|image: vibe-app:v3|image: vietdungregister/nthl:v4|g' docker-compose.yml
# Verify
grep "image:" docker-compose.yml
echo "✅ docker-compose.yml updated"

# Update NEXTAUTH_URL
sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL="http://188.166.177.93:3001"|g' .env
echo "✅ .env NEXTAUTH_URL updated"

# ── [4] Pull Docker image ─────────────────────────────────
echo ""
echo "⏳ [4/7] Pull Docker image vietdungregister/nthl:v4..."
docker pull vietdungregister/nthl:v4
echo "✅ Image pulled"

# ── [5] Restart containers ───────────────────────────────
echo ""
echo "⏳ [5/7] Restart Docker containers..."
docker compose down
docker compose up -d
echo "✅ Containers started"
echo "Chờ 15s cho containers khởi động..."
sleep 15
docker ps

# ── [6] Restore DB ───────────────────────────────────────
echo ""
echo "⏳ [6/7] Restore database..."

# Đảm bảo pgvector extension
docker exec vibe-db psql -U vibe_user -d vibe_db -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || true

# Copy dump vào container
echo "Copy dump vào container..."
docker cp ~/nthl_full.dump vibe-db:/tmp/nthl_full.dump

# Restore
echo "Đang restore (có thể mất 5-10 phút)..."
docker exec vibe-db pg_restore -U vibe_user -d vibe_db \
  --clean --if-exists --no-owner --no-privileges \
  /tmp/nthl_full.dump

# Chạy migration mới
echo "Chạy prisma migrate deploy..."
docker exec vibe-app npx prisma migrate deploy

# Tối ưu PostgreSQL cho 2GB RAM
docker exec vibe-db psql -U vibe_user -d vibe_db -c "
  ALTER SYSTEM SET shared_buffers = '256MB';
  ALTER SYSTEM SET work_mem = '8MB';
  ALTER SYSTEM SET effective_cache_size = '1GB';
  SELECT pg_reload_conf();
" 2>/dev/null || true

# Dọn file tạm
docker exec vibe-db rm -f /tmp/nthl_full.dump
rm -f ~/nthl_full.dump
echo "✅ Database restored"

# ── [7] Restore media ────────────────────────────────────
echo ""
echo "⏳ [7/7] Restore media uploads (2.4GB)..."
UPLOAD_PATH=$(docker inspect vibe-app --format '{{ range .Mounts }}{{ if eq .Destination "/app/public/uploads" }}{{ .Source }}{{ end }}{{ end }}')
echo "Upload volume: $UPLOAD_PATH"

if [ -z "$UPLOAD_PATH" ]; then
  echo "⚠️  Không tìm thấy volume path, thử cách khác..."
  docker cp ~/nthl_uploads.tar.gz vibe-app:/app/public/uploads/nthl_uploads.tar.gz
  docker exec vibe-app tar xzf /app/public/uploads/nthl_uploads.tar.gz -C /app/public/uploads/
  docker exec vibe-app rm -f /app/public/uploads/nthl_uploads.tar.gz
else
  tar xzf ~/nthl_uploads.tar.gz -C "$UPLOAD_PATH"/
fi

rm -f ~/nthl_uploads.tar.gz
echo "✅ Media restored"

# ── VERIFY ───────────────────────────────────────────────
echo ""
echo "=============================="
echo "  Verify..."
echo "=============================="

docker exec vibe-db psql -U vibe_user -d vibe_db -c "
  SELECT 'works' AS entity, COUNT(*) FROM \"Work\"
  UNION ALL SELECT 'chunks', COUNT(*) FROM \"ChatChunk\"
  UNION ALL SELECT 'tags', COUNT(*) FROM \"Tag\";
"

curl -s -o /dev/null -w "Web HTTP status: %{http_code}\n" http://localhost:3001/

echo ""
echo "RAM usage:"
free -h

echo ""
echo "=============================="
echo "  🚀 DEPLOY COMPLETE!"
echo "  URL: http://188.166.177.93:3001/"
echo "  CMS: http://188.166.177.93:3001/cms/login"
echo "=============================="
