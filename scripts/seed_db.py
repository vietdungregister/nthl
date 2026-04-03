#!/usr/bin/env python3
"""
seed_db.py — Import works + chunks vào PostgreSQL (v2 — fast batch mode)
=========================================================================
Cách chạy:
  python3 scripts/seed_db.py

Tính năng:
  - Checkpoint: resume nếu bị gián đoạn
  - Batch embed insert: dùng unnest (nhanh 100×)
  - Tự động skip nếu đã có data
"""

import json, os, sys, time
from pathlib import Path
from datetime import datetime, timezone

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
    import psycopg2
    from psycopg2.extras import execute_values

# ── Config ────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent
DATA_DIR    = BASE_DIR / "output" / "data"
WORKS_FILE  = DATA_DIR / "works.json"
CHUNKS_FILE = DATA_DIR / "chunks_with_embeddings.json"
CKPT_FILE   = DATA_DIR / "seed_checkpoint.json"

BATCH_SIZE       = 500   # Works batch
CHUNK_BATCH_SIZE = 50    # Chunks with embedding (smaller = safer memory)
CKPT_EVERY       = 2000  # Save checkpoint every N chunks

# ── Helpers ───────────────────────────────────────────────────────────────────
def batched(items, n):
    for i in range(0, len(items), n):
        yield items[i:i+n]

def parse_dt(s):
    if not s: return datetime.now(timezone.utc)
    try:    return datetime.fromisoformat(s.replace('Z', '+00:00'))
    except: return datetime.now(timezone.utc)

def load_db_url():
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        for line in open(env_file):
            if line.startswith("DATABASE_URL="):
                return line.strip().split("=", 1)[1].strip('"').strip("'")
    return os.environ.get("DATABASE_URL")

def load_checkpoint():
    if CKPT_FILE.exists():
        return json.load(open(CKPT_FILE))
    return {"chunks_done": 0}

def save_checkpoint(data):
    json.dump(data, open(CKPT_FILE, 'w'))

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  Seed DB v2 — Fast Batch Mode")
    print("=" * 60); print()

    db_url = load_db_url()
    conn   = psycopg2.connect(db_url)
    cur    = conn.cursor()
    print("✅ Connected to PostgreSQL\n")

    # pgvector + embedding column
    for sql in [
        "CREATE EXTENSION IF NOT EXISTS vector",
        'ALTER TABLE "ChatChunk" ADD COLUMN IF NOT EXISTS embedding vector(3072)',
    ]:
        try:
            cur.execute(sql); conn.commit()
        except Exception: conn.rollback()

    now = datetime.now(timezone.utc)

    # ── 1. Load files ──────────────────────────────────────
    print("📂 Đọc works.json..."); t0 = time.time()
    works = json.load(open(WORKS_FILE, encoding='utf-8'))
    print(f"   {len(works):,} works ({time.time()-t0:.1f}s)\n")

    print("📂 Đọc chunks_with_embeddings.json..."); t0 = time.time()
    chunks = json.load(open(CHUNKS_FILE, encoding='utf-8'))
    print(f"   {len(chunks):,} chunks ({time.time()-t0:.1f}s)\n")

    # ── 2. Import Works ────────────────────────────────────
    cur.execute('SELECT COUNT(*) FROM "Work" WHERE source=%s', ('facebook',))
    if cur.fetchone()[0] > 0:
        print("⏭  Works đã có trong DB — skip\n")
    else:
        # Load existing slugs to avoid UniqueViolation
        cur.execute('SELECT slug FROM "Work"')
        existing_slugs = {r[0] for r in cur.fetchall()}
        print(f"   Existing slugs in DB: {len(existing_slugs):,}")

        print(f"📥 Import {len(works):,} works...")
        count  = 0
        skip_s = 0

        for batch in batched(works, BATCH_SIZE):
            rows = []
            for w in batch:
                slug = w['slug'][:500]
                if slug in existing_slugs:
                    # Make unique slug
                    slug = slug[:490] + '-' + w['id'][:8]
                if slug in existing_slugs:
                    skip_s += 1
                    continue
                existing_slugs.add(slug)

                dt = parse_dt(w.get('publishedAt'))
                rows.append((
                    w['id'],
                    w['title'][:500],
                    slug,
                    w.get('genre', 'prose'),
                    w.get('content', ''),
                    (w.get('excerpt') or '')[:1000] or None,
                    w.get('status', 'published'),
                    dt,    # publishedAt
                    False, # isFeatured
                    now,   # createdAt
                    now,   # updatedAt
                    w.get('source', 'facebook'),
                    w.get('fbTimestamp'),
                    w.get('autoClassified', True),
                ))

            if rows:
                execute_values(cur, """
                    INSERT INTO "Work"
                        (id, title, slug, genre, content, excerpt,
                         status, "publishedAt", "isFeatured",
                         "createdAt", "updatedAt",
                         source, "fbTimestamp", "autoClassified")
                    VALUES %s
                    ON CONFLICT DO NOTHING
                """, rows)
                conn.commit()
            count += len(rows)
            print(f"   {count:,}/{len(works):,} (skipped slug dup: {skip_s})")
        print(f"✅ {count:,} works imported, {skip_s:,} slug dups skipped\n")


    # ── 3. Import Chunks (batch unnest with embedding) ─────
    cur.execute('SELECT COUNT(*) FROM "ChatChunk"')
    existing_chunks = cur.fetchone()[0]

    ckpt = load_checkpoint()
    start_idx = ckpt.get("chunks_done", 0)

    if existing_chunks > 0 and start_idx == 0:
        print(f"⏭  ChatChunk đã có {existing_chunks:,} rows — skip\n")
    else:
        # Get valid work IDs
        cur.execute('SELECT id FROM "Work" WHERE source=%s', ('facebook',))
        valid_ids = {r[0] for r in cur.fetchall()}
        print(f"   Valid workIds: {len(valid_ids):,}")

        remaining = chunks[start_idx:]
        print(f"📥 Import chunks từ #{start_idx:,} → {len(chunks):,}...")

        inserted = existing_chunks
        skipped  = 0
        t_start  = time.time()

        for batch_num, batch in enumerate(batched(remaining, CHUNK_BATCH_SIZE)):
            ids, wids, contents, scores, blocked, embs = [], [], [], [], [], []

            for c in batch:
                if c['workId'] not in valid_ids:
                    skipped += 1
                    continue
                ids.append(c['id'])
                wids.append(c['workId'])
                contents.append(c['content'][:2000])
                scores.append(float(c.get('score', 0)))
                blocked.append(c.get('isBlocked', False))
                embs.append(c.get('embedding'))

            if not ids:
                continue

            # Build SQL — use unnest for batch insert including vector column
            # embedding can be NULL for chunks without it
            emb_literals = [
                f'({i}::int, %s::vector)' if e is not None else f'({i}::int, NULL)'
                for i, e in enumerate(embs)
            ]
            emb_vals = [
                '[' + ','.join(f'{v:.6f}' for v in e) + ']'
                for e in embs if e is not None
            ]

            # Simpler approach: use execute_values + explicit cast
            rows = []
            for j in range(len(ids)):
                emb_str = (
                    '[' + ','.join(f'{v:.6f}' for v in embs[j]) + ']'
                    if embs[j] is not None else None
                )
                rows.append((
                    ids[j], wids[j], contents[j],
                    scores[j], blocked[j], now, emb_str
                ))

            # Insert without embedding first (fast)
            no_emb = [(r[0],r[1],r[2],r[3],r[4],r[5]) for r in rows]
            execute_values(cur, """
                INSERT INTO "ChatChunk" (id, "workId", content, score, "isBlocked", "createdAt")
                VALUES %s ON CONFLICT (id) DO NOTHING
            """, no_emb)

            # Update embedding where present
            for r in rows:
                if r[6] is not None:
                    cur.execute("""
                        UPDATE "ChatChunk" SET embedding = %s::vector WHERE id = %s
                    """, (r[6], r[0]))

            conn.commit()
            inserted += len(ids)

            # Progress
            done = start_idx + (batch_num + 1) * CHUNK_BATCH_SIZE
            pct  = min(done / len(chunks) * 100, 100)
            elapsed = time.time() - t_start
            rate = (batch_num + 1) * CHUNK_BATCH_SIZE / elapsed if elapsed > 0 else 0
            eta  = (len(chunks) - done) / rate / 60 if rate > 0 else 0

            if (batch_num + 1) % 40 == 0:
                print(f"   [{pct:5.1f}%] {inserted:,} inserted | {rate:.0f}/s | ETA {eta:.1f}m")

            # Checkpoint
            if (batch_num + 1) % (CKPT_EVERY // CHUNK_BATCH_SIZE) == 0:
                save_checkpoint({"chunks_done": start_idx + (batch_num + 1) * CHUNK_BATCH_SIZE})
                print(f"   💾 checkpoint @ {done:,}")

        print(f"\n✅ {inserted:,} chunks | {skipped:,} skipped\n")

    # ── 4. HNSW Index ──────────────────────────────────────
    print("🔍 Tạo HNSW index...")
    try:
        cur.execute("""
            CREATE INDEX IF NOT EXISTS "ChatChunk_embedding_hnsw"
            ON "ChatChunk" USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
        """)
        conn.commit()
        print("   ✅ HNSW index done\n")
    except Exception as e:
        conn.rollback()
        print(f"   ⚠️ {e}\n")

    # ── 5. Stats ────────────────────────────────────────────
    cur.execute('SELECT COUNT(*) FROM "Work" WHERE source=%s', ('facebook',))
    tw = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM "ChatChunk"')
    tc = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM "ChatChunk" WHERE embedding IS NOT NULL')
    te = cur.fetchone()[0]

    cur.close(); conn.close()
    if CKPT_FILE.exists(): CKPT_FILE.unlink()

    print("=" * 60)
    print("  ✅ SEED HOÀN THÀNH!")
    print(f"     Works  : {tw:,}")
    print(f"     Chunks : {tc:,}")
    print(f"     w/ emb : {te:,}")
    print("=" * 60)
    print()
    print("👉 Bước tiếp theo:")
    print("   npx prisma generate")
    print("   npm run dev")

if __name__ == '__main__':
    main()
