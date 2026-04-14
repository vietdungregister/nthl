#!/bin/bash
# =============================================================================
# verify.sh — Verify toàn bộ hệ thống sau khi import/deploy
# =============================================================================
# Usage: bash .agents/skills/import-works/scripts/verify.sh [--production]
#
# Mặc định check local DB. Thêm --production để check server.
# =============================================================================

set -euo pipefail

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
SERVER_IP="188.166.177.93"
CHECK_PROD=false

[[ "${1:-}" == "--production" ]] && CHECK_PROD=true

echo "╔══════════════════════════════════════════╗"
echo "║   NTHL System Verification               ║"
echo "╚══════════════════════════════════════════╝"
echo ""

run_db_query() {
  local label=$1
  local query=$2
  if [[ $CHECK_PROD == true ]]; then
    ssh -o StrictHostKeyChecking=no root@${SERVER_IP} \
      "docker exec vibe-db psql -U vibe_user -d vibe_db -t -c \"$query\""
  else
    docker exec vibe-db psql -U vibe_user -d vibe_db -t -c "$query"
  fi
}

echo "═══ 1. Database Counts ═══"
MODE=$([[ $CHECK_PROD == true ]] && echo "PRODUCTION" || echo "LOCAL")
echo "   ($MODE)"
echo ""

echo "   Works (published):"
run_db_query "works" \
  "SELECT COUNT(*) FROM \"Work\" WHERE status='published' AND \"deletedAt\" IS NULL;"

echo "   Works by genre:"
run_db_query "genres" \
  "SELECT genre, COUNT(*) FROM \"Work\" WHERE status='published' AND \"deletedAt\" IS NULL GROUP BY genre ORDER BY count DESC;"

echo "   Chunks total:"
run_db_query "chunks" \
  "SELECT COUNT(*) FROM \"ChatChunk\";"

echo "   Chunks with embeddings:"
run_db_query "embeddings" \
  "SELECT COUNT(*) FROM \"ChatChunk\" WHERE embedding IS NOT NULL;"

echo "   Works with searchVector (FTS):"
run_db_query "fts" \
  "SELECT COUNT(*) FROM \"Work\" WHERE \"searchVector\" IS NOT NULL;"

echo ""
echo "═══ 2. Search Test ═══"

if [[ $CHECK_PROD == true ]]; then
  echo "   Testing 'một bài thơ' on production API..."
  RESULT=$(ssh -o StrictHostKeyChecking=no root@${SERVER_IP} \
    "curl -s 'http://localhost:3001/api/search?q=m%E1%BB%99t%20b%C3%A0i%20th%C6%A1'" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(f'   {len(d.get(\"works\",[]))} results, top: {d[\"works\"][0][\"title\"] if d.get(\"works\") else \"NONE\"}')")
  echo "$RESULT"
else
  echo "   (Skipped — local app not running. Use --production to test.)"
fi

echo ""
echo "═══ 3. Indexes ═══"
echo "   Search indexes present:"
run_db_query "indexes" \
  "SELECT indexname FROM pg_indexes WHERE tablename='Work' AND indexdef LIKE '%gin%' ORDER BY indexname;"

echo ""
echo "═══ 4. HTTP Health (Production) ═══"
if [[ $CHECK_PROD == true ]]; then
  for path in "/" "/tac-pham" "/tim-kiem"; do
    CODE=$(ssh -o StrictHostKeyChecking=no root@${SERVER_IP} \
      "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001${path}")
    STATUS=$([[ "$CODE" == "200" ]] && echo "✅" || echo "❌")
    echo "   ${STATUS} ${path} → HTTP ${CODE}"
  done
else
  echo "   (Skipped — use --production)"
fi

echo ""
echo "═══ Done ═══"
