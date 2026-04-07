#!/bin/bash
# run-all.sh — Chạy toàn bộ pipeline crawl-forums (Phase 1-6)
# =============================================================
# Usage: bash .agents/skills/crawl-forums/scripts/run-all.sh
#
# Prerequisites:
#   - Docker Desktop đang chạy (vibe-db container)
#   - OPENAI_API_KEY và DATABASE_URL trong .env
#   - Python 3.12+ với requests, beautifulsoup4, openai, psycopg2-binary
#
# Phase 7 (deploy) phải chạy riêng vì cần SSH access.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../../../.." && pwd)"
SCRIPTS_DIR="$PROJECT_DIR/scripts/crawl-forums"

echo "============================================================"
echo "  NTHL Forum Crawl & Import Pipeline"
echo "  Project: $PROJECT_DIR"
echo "============================================================"
echo ""

# ── Phase 1: Crawl ──────────────────────────────────────────
echo "▶ Phase 1: Crawl (4 nguồn)"
echo "  1a. tienve.org..."
python3 "$SCRIPTS_DIR/crawl-tienve.py"
echo ""

echo "  1b. gio-o.com..."
python3 "$SCRIPTS_DIR/crawl-gioo.py"
echo ""

echo "  1c+1d. ttvnol.com (2 topics song song)..."
python3 "$SCRIPTS_DIR/crawl-ttvnol.py" --topic 221106 &
PID1=$!
sleep 3
python3 "$SCRIPTS_DIR/crawl-ttvnol.py" --topic 51077 &
PID2=$!
wait $PID1 $PID2
echo ""

# ── Phase 2: Parse & Clean ──────────────────────────────────
echo "▶ Phase 2: Parse & Clean"
python3 "$SCRIPTS_DIR/parse-forum-works.py"
echo ""

# ── Phase 3: AI Genre Classification ────────────────────────
echo "▶ Phase 3: AI Genre Classification"
python3 "$SCRIPTS_DIR/classify-genres.py"
echo ""

# ── Phase 4: Dedup vs existing DB ───────────────────────────
echo "▶ Phase 4: Dedup"
python3 "$SCRIPTS_DIR/dedup-forum-works.py"
echo ""

# ── Phase 5: Chunk + Embeddings ─────────────────────────────
echo "▶ Phase 5: Chunk + Embeddings"
python3 "$SCRIPTS_DIR/chunk-and-embed-forums.py"
echo ""

# ── Phase 6: Seed DB ────────────────────────────────────────
echo "▶ Phase 6: Seed DB"
python3 "$SCRIPTS_DIR/seed-forum-works.py"
echo ""

# ── Summary ─────────────────────────────────────────────────
echo "============================================================"
echo "  ✅ Pipeline Phase 1-6 hoàn thành!"
echo ""
echo "  Next steps:"
echo "    Phase 7: Deploy to production"
echo "    → Xem SKILL.md mục 'Phase 7 — Deploy to Production'"
echo ""
echo "    Admin review bài draft:"
echo "    → CMS → filter status=draft"
echo "============================================================"
