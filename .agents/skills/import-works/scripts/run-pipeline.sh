#!/bin/bash
# =============================================================================
# run-pipeline.sh — Chạy toàn bộ Import Works pipeline
# =============================================================================
# Usage:
#   bash .agents/skills/import-works/scripts/run-pipeline.sh [--skip-embed] [--skip-deploy]
#
# Options:
#   --skip-embed   Bỏ qua Phase 6 (embeddings) — dùng khi chỉ cần keyword search
#   --skip-deploy  Bỏ qua Phase 8 (deploy) — dùng khi chỉ test local
#   --from-phase N Bắt đầu từ phase N (resume)
# =============================================================================

set -euo pipefail

PROJECT_DIR="/Users/duongvietdung/Documents/Projects/baitapcuoikhoa"
cd "$PROJECT_DIR"

SKIP_EMBED=false
SKIP_DEPLOY=false
FROM_PHASE=1

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-embed)  SKIP_EMBED=true; shift ;;
    --skip-deploy) SKIP_DEPLOY=true; shift ;;
    --from-phase)  FROM_PHASE=$2; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "╔══════════════════════════════════════════╗"
echo "║   NTHL Import Works Pipeline             ║"
echo "║   Starting from Phase $FROM_PHASE                   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Phase 1: Parse ──────────────────────────────────────────────────────────
if [[ $FROM_PHASE -le 1 ]]; then
  echo "═══ Phase 1: Parse Facebook JSON ═══"
  python3 scripts/build-data.py
  echo ""
fi

# ── Phase 2-4: Clean + Classify + Structural ────────────────────────────────
if [[ $FROM_PHASE -le 4 ]]; then
  CLEAN_ARGS=""
  if [[ $FROM_PHASE -ge 2 ]]; then
    CLEAN_ARGS="--from-phase $FROM_PHASE"
  fi
  echo "═══ Phase 2-4: Clean + AI Classify + Structural ═══"
  echo "⚠️  Phase 3 (AI Genre) mất ~1-2 giờ và tốn ~\$0.30"
  echo "    Ctrl+C để dừng — checkpoint tự lưu, chạy lại sẽ tiếp tục"
  echo ""
  python3 scripts/clean-data.py $CLEAN_ARGS
  echo ""
fi

# ── Phase 5-6: Embeddings ───────────────────────────────────────────────────
if [[ $SKIP_EMBED == false ]] && [[ $FROM_PHASE -le 6 ]]; then
  echo "═══ Phase 6: Generate Embeddings ═══"
  echo "⚠️  Mất ~30-60 phút, tốn ~\$1.60 cho full dataset"
  python3 scripts/generate_embeddings.py
  echo ""
fi

# ── Phase 7: Seed DB ────────────────────────────────────────────────────────
if [[ $FROM_PHASE -le 7 ]]; then
  echo "═══ Phase 7: Seed Database ═══"
  python3 scripts/seed_db.py
  echo ""
fi

# ── Phase 8: Deploy ─────────────────────────────────────────────────────────
if [[ $SKIP_DEPLOY == false ]] && [[ $FROM_PHASE -le 8 ]]; then
  echo "═══ Phase 8: Deploy Production ═══"
  bash .agents/skills/import-works/scripts/deploy-db.sh
  echo ""
fi

echo "╔══════════════════════════════════════════╗"
echo "║   ✅ Pipeline hoàn thành!                 ║"
echo "╚══════════════════════════════════════════╝"
