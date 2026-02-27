#!/bin/bash
# ============================================================
# deploy-init.sh — Khởi tạo database lần đầu sau khi deploy
# Chạy MỘT LẦN sau khi docker compose up -d thành công
# Usage: bash deploy-init.sh
# ============================================================
set -e

echo "======================================"
echo "  Vibe App — Database Initialization  "
echo "======================================"

# Chờ container app sẵn sàng
echo ""
echo "⏳ Waiting for app container to be ready..."
sleep 5

# Chạy Prisma migrations
echo ""
echo "⏳ Running Prisma migrations..."
docker compose exec -T app npx prisma migrate deploy
echo "✅ Migrations complete!"

# Seed database (genres, admin account, author profile, sample works)
echo ""
echo "⏳ Seeding database (admin, genres, sample content)..."
docker compose exec -T app node prisma/seed-docker.cjs
echo "✅ Seed complete!"

echo ""
echo "======================================"
echo "  ✅ Database initialized successfully!"
echo ""
echo "  App URL:  http://$(hostname -I | awk '{print $1}'):3001"
echo "  CMS URL:  http://$(hostname -I | awk '{print $1}'):3001/cms/login"
echo "======================================"
