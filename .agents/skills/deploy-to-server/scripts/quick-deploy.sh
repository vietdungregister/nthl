#!/bin/bash
# ============================================================================
# quick-deploy.sh — Deploy nhanh khi chỉ thay đổi code (không đổi DB/media)
#
# USAGE: bash .agents/skills/deploy-to-server/scripts/quick-deploy.sh v5
#
# Chỉ cần 1 argument: tag mới (v5, v6, v7, ...)
# ============================================================================

TAG=${1:?"Usage: $0 <tag> (e.g. v5)"}
DOCKER_IMAGE="vietdungregister/nthl"
SERVER="root@188.166.177.93"

set -e

echo "🚀 Quick deploy: $DOCKER_IMAGE:$TAG"
echo ""

# [1] Build + push
echo "⏳ Building Docker image..."
docker buildx build --platform linux/amd64 -t "$DOCKER_IMAGE:$TAG" --push .
echo "✅ Image pushed"

# [2] Update server
echo ""
echo "⏳ Deploying on server..."
ssh -o StrictHostKeyChecking=no $SERVER << EOF
  cd /app
  docker pull $DOCKER_IMAGE:$TAG
  sed -i "s|image: ${DOCKER_IMAGE}:v[0-9]*|image: ${DOCKER_IMAGE}:${TAG}|g" docker-compose.yml
  docker compose down && docker compose up -d
  sleep 10
  docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3001/
EOF

echo ""
echo "✅ Quick deploy complete!"
echo "🌐 http://188.166.177.93:3001/"
