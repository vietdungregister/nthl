#!/bin/bash
# =============================================================================
# deploy-db.sh — Export local DB → Upload → Restore on production server
# =============================================================================
# Usage: bash .agents/skills/import-works/scripts/deploy-db.sh
# =============================================================================

set -euo pipefail

SERVER_IP="188.166.177.93"
PROJECT_DIR="/Users/duongvietdung/Documents/Projects/baitapcuoikhoa"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

cd "$PROJECT_DIR"

echo "═══ Step 1: Export local DB dump ═══"
docker exec vibe-db pg_dump -U vibe_user -d vibe_db \
  --no-owner --no-privileges --clean --if-exists \
  -F custom -f /tmp/db_export.dump
docker cp vibe-db:/tmp/db_export.dump ./db_export.dump
ls -lh db_export.dump
echo ""

echo "═══ Step 2: Upload to server ═══"
rsync -avz --progress --partial db_export.dump root@${SERVER_IP}:~/db_export.dump
echo ""

echo "═══ Step 3: Restore on server (nohup) ═══"
ssh -o StrictHostKeyChecking=no root@${SERVER_IP} 'nohup bash -c "
  echo \"[$(date)] Starting restore...\"
  docker cp ~/db_export.dump vibe-db:/tmp/db_export.dump &&
  docker exec vibe-db pg_restore -U vibe_user -d vibe_db \
    --clean --if-exists --no-owner --no-privileges /tmp/db_export.dump 2>&1 | tail -5 &&
  echo \"[$(date)] Cleanup...\" &&
  docker exec vibe-db rm -f /tmp/db_export.dump &&
  rm -f ~/db_export.dump &&
  echo \"[$(date)] Restore DONE\"
" > /tmp/restore.log 2>&1 &'
echo "Restore started in background on server."
echo "Monitor: ssh root@${SERVER_IP} 'tail -f /tmp/restore.log'"
echo ""

echo "═══ Step 4: Cleanup local ═══"
rm -f db_export.dump
echo "Local dump cleaned up."
echo ""

echo "═══ Step 5: Deploy latest app image ═══"
ssh -o StrictHostKeyChecking=no root@${SERVER_IP} "
  cd /app &&
  docker pull vietdungregister/nthl:latest 2>&1 | tail -2 &&
  docker compose stop app &&
  docker compose up -d app &&
  sleep 8 &&
  curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:3001/
"
echo ""

echo "✅ Deploy complete. DB restore running in background."
echo "   Verify: ssh root@${SERVER_IP} 'tail /tmp/restore.log'"
