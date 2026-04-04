#!/bin/bash
# ============================================================================
# local-prepare.sh — Chạy trên Mac local để chuẩn bị mọi thứ trước khi deploy
#
# USAGE: bash .agents/skills/deploy-to-server/scripts/local-prepare.sh
#
# Sẽ tự động:
#   1. Kiểm tra force-dynamic trên Server Components
#   2. Kiểm tra .dockerignore
#   3. Build Docker image cross-platform
#   4. Export DB dump
#   5. Compress media uploads
#   6. Commit + push code
# ============================================================================

# ── CONFIG ───────────────────────────────────────────────────────────────────
DOCKER_IMAGE="vietdungregister/nthl"
TAG="v4"                              # ← Đổi mỗi lần deploy
GIT_AUTHOR_NAME="Duong Viet Dung"
GIT_AUTHOR_EMAIL="duongvietdung@cityascom.vn"
DB_CONTAINER="vibe-db"
DB_USER="vibe_user"
DB_NAME="vibe_db"
GIT_BRANCH="master"
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "=============================="
echo "  Local Preparation Script"
echo "  Image: $DOCKER_IMAGE:$TAG"
echo "=============================="

# ── [1] CHECK force-dynamic ──────────────────────────────────────────────────
echo ""
echo "⏳ [1/6] Kiểm tra force-dynamic..."
MISSING=$(find src/app -name "page.tsx" \
  -exec grep -L "force-dynamic\|revalidate\|use client" {} \; 2>/dev/null \
  | xargs grep -l "prisma\|from.*db" 2>/dev/null || true)

if [ -n "$MISSING" ]; then
  echo "⚠️  Các Server Components SAU đang thiếu force-dynamic:"
  echo "$MISSING"
  echo "  → Thêm: export const dynamic = 'force-dynamic'"
  echo "  → Chạy lại sau khi fix."
  exit 1
fi
echo "✅ Tất cả Server Components đã có force-dynamic"

# ── [2] CHECK .dockerignore ──────────────────────────────────────────────────
echo ""
echo "⏳ [2/6] Kiểm tra .dockerignore..."

for DIR in "/media/" "/output/" "/public/uploads/fb/" "*.dump" "*.tar.gz"; do
  if ! grep -q "$DIR" .dockerignore 2>/dev/null; then
    echo "⚠️  .dockerignore THIẾU: $DIR"
    echo "  → Thêm vào .dockerignore rồi chạy lại."
    exit 1
  fi
done
echo "✅ .dockerignore OK"

# ── [3] BUILD Docker image ──────────────────────────────────────────────────
echo ""
echo "⏳ [3/6] Build Docker image (linux/amd64)..."
docker buildx build --platform linux/amd64 -t "$DOCKER_IMAGE:$TAG" --push .
echo "✅ Image pushed: $DOCKER_IMAGE:$TAG"

# ── [4] EXPORT DB dump ──────────────────────────────────────────────────────
echo ""
echo "⏳ [4/6] Export database dump..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME \
  --no-owner --no-privileges --clean --if-exists \
  -F custom -f /tmp/nthl_full.dump
docker cp $DB_CONTAINER:/tmp/nthl_full.dump ./nthl_full.dump
docker exec $DB_CONTAINER rm -f /tmp/nthl_full.dump
echo "✅ DB dump: $(ls -lh nthl_full.dump | awk '{print $5}')"

# ── [5] COMPRESS media ──────────────────────────────────────────────────────
echo ""
echo "⏳ [5/6] Compress media uploads..."
if [ -d "public/uploads" ] && [ "$(ls public/uploads/ | wc -l)" -gt 1 ]; then
  tar czf nthl_uploads.tar.gz -C public/uploads .
  echo "✅ Media: $(ls -lh nthl_uploads.tar.gz | awk '{print $5}')"
else
  echo "⏯️  Bỏ qua — thư mục uploads trống"
fi

# ── [6] COMMIT + PUSH ───────────────────────────────────────────────────────
echo ""
echo "⏳ [6/6] Commit + push..."
git config user.name "$GIT_AUTHOR_NAME"
git config user.email "$GIT_AUTHOR_EMAIL"

git add .gitignore .dockerignore prisma/ src/ Dockerfile docker-compose.yml \
  next.config.ts package.json package-lock.json scripts/ .agents/ 2>/dev/null || true

if git diff --cached --quiet; then
  echo "✅ Không có thay đổi code mới — skip commit"
else
  git commit -m "deploy: prepare $DOCKER_IMAGE:$TAG

Co-authored-by: AI Agent <agent@example.com>"
  git push origin $GIT_BRANCH
  echo "✅ Code pushed"
fi

# ── SUMMARY ──────────────────────────────────────────────────────────────────
echo ""
echo "=============================="
echo "  ✅ LOCAL PREPARATION DONE"
echo "=============================="
echo "Files ready to upload:"
[ -f nthl_full.dump ] && echo "  📦 nthl_full.dump       $(ls -lh nthl_full.dump | awk '{print $5}')"
[ -f nthl_uploads.tar.gz ] && echo "  📦 nthl_uploads.tar.gz  $(ls -lh nthl_uploads.tar.gz | awk '{print $5}')"
echo ""
echo "Next steps:"
echo "  1. rsync -avz --progress --partial nthl_full.dump root@SERVER_IP:~/"
echo "  2. rsync -avz --progress --partial nthl_uploads.tar.gz root@SERVER_IP:~/"
echo "  3. ssh root@SERVER_IP 'bash -s' < .agents/skills/deploy-to-server/scripts/server-deploy.sh"
echo "=============================="
