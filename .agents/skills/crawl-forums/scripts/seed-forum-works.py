#!/usr/bin/env python3
"""
seed-forum-works.py — Phase 6: Import forum works + chunks vào DB
==================================================================
Đọc forum_works_new.json + forum_chunks_with_embeddings.json
→ INSERT vào Work + ChatChunk tables.
"""

import json, os, sys, time
from pathlib import Path
from datetime import datetime, timezone

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    os.system(f"{sys.executable} -m pip install --break-system-packages psycopg2-binary -q")
    import psycopg2
    from psycopg2.extras import execute_values

BASE_DIR     = Path(__file__).parent.parent.parent
DATA_DIR     = BASE_DIR / "output" / "data"
WORKS_FILE   = DATA_DIR / "forum_works_new.json"
CHUNKS_FILE  = DATA_DIR / "forum_chunks_with_embeddings.json"

WORK_BATCH_SIZE  = 200
CHUNK_BATCH_SIZE = 50


def load_db_url():
    env = BASE_DIR / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("DATABASE_URL")


def parse_dt(s):
    if not s:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00'))
    except Exception:
        return datetime.now(timezone.utc)


def batched(items, n):
    for i in range(0, len(items), n):
        yield items[i:i+n]


def main():
    print("=" * 60)
    print("  Phase 6: Seed Forum Works → DB")
    print("=" * 60)
    print()

    # Load data
    works  = json.loads(WORKS_FILE.read_text(encoding='utf-8'))
    chunks = json.loads(CHUNKS_FILE.read_text(encoding='utf-8'))
    print(f"  Works to import:  {len(works)}")
    print(f"  Chunks to import: {len(chunks)}")

    # Connect
    db_url = load_db_url()
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    print("  ✅ Connected to PostgreSQL\n")

    now = datetime.now(timezone.utc)

    # ── Stats before ──
    cur.execute('SELECT COUNT(*) FROM "Work"')
    works_before = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM "ChatChunk"')
    chunks_before = cur.fetchone()[0]
    print(f"  Before: {works_before:,} works | {chunks_before:,} chunks")

    # ── Import Works ──────────────────────────────────────────
    print(f"\n  📥 Import {len(works)} forum works...")

    # Load existing slugs
    cur.execute('SELECT slug FROM "Work"')
    existing_slugs = {r[0] for r in cur.fetchall()}

    count = 0
    skipped = 0
    work_id_map = {}  # track successfully inserted work IDs

    for batch in batched(works, WORK_BATCH_SIZE):
        rows = []
        for w in batch:
            slug = w.get('slug', '')[:499]
            if slug in existing_slugs:
                skipped += 1
                continue
            existing_slugs.add(slug)

            published_at = parse_dt(w.get('publishedAt'))
            written_at   = parse_dt(w.get('writtenAt') or w.get('publishedAt'))

            rows.append((
                w['id'],
                w.get('title', '')[:500],
                slug,
                w.get('genre', 'stt'),
                w.get('content', ''),
                (w.get('excerpt') or '')[:1000] or None,
                'published',
                published_at,
                written_at,
                False,  # isFeatured
                now,    # createdAt
                now,    # updatedAt
                w.get('source', 'forum'),
                None,   # fbTimestamp
                w.get('autoClassified', True),
                w.get('sourceUrl', '')[:1000] or None,
            ))
            work_id_map[w['id']] = True

        if rows:
            execute_values(cur, """
                INSERT INTO "Work"
                    (id, title, slug, genre, content, excerpt,
                     status, "publishedAt", "writtenAt", "isFeatured",
                     "createdAt", "updatedAt",
                     source, "fbTimestamp", "autoClassified",
                     "seoDescription")
                VALUES %s
                ON CONFLICT (slug) DO NOTHING
            """, rows)
            conn.commit()
        count += len(rows)
        print(f"    {count}/{len(works)} works (skipped slug dup: {skipped})")

    print(f"  ✅ {count} works imported, {skipped} skipped\n")

    # ── Import Chunks ─────────────────────────────────────────
    print(f"  📥 Import {len(chunks)} chunks...")

    # Get valid work IDs (inserted + existing)
    cur.execute('SELECT id FROM "Work"')
    valid_work_ids = {r[0] for r in cur.fetchall()}

    chunk_count = 0
    chunk_skipped = 0
    t_start = time.time()

    for batch_num, batch in enumerate(batched(chunks, CHUNK_BATCH_SIZE)):
        rows = []
        for c in batch:
            if c.get('workId') not in valid_work_ids:
                chunk_skipped += 1
                continue
            rows.append((c['id'], c['workId'], c['content'][:2000], 0, False, now))

        if rows:
            execute_values(cur, """
                INSERT INTO "ChatChunk" (id, "workId", content, score, "isBlocked", "createdAt")
                VALUES %s ON CONFLICT (id) DO NOTHING
            """, rows)

            # Update embeddings
            for c in batch:
                if c.get('workId') not in valid_work_ids:
                    continue
                emb = c.get('embedding')
                if emb:
                    emb_str = '[' + ','.join(f'{v:.6f}' for v in emb) + ']'
                    cur.execute(
                        'UPDATE "ChatChunk" SET embedding = %s::vector WHERE id = %s',
                        (emb_str, c['id'])
                    )

            conn.commit()
            chunk_count += len(rows)

        if (batch_num + 1) % 40 == 0:
            elapsed = time.time() - t_start
            rate = chunk_count / elapsed if elapsed > 0 else 0
            print(f"    {chunk_count:,}/{len(chunks):,} chunks | {rate:.0f}/s")

    print(f"  ✅ {chunk_count} chunks imported\n")

    # ── Stats after ───────────────────────────────────────────
    cur.execute('SELECT COUNT(*) FROM "Work"')
    works_after = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM "ChatChunk"')
    chunks_after = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM "ChatChunk" WHERE embedding IS NOT NULL')
    with_vectors = cur.fetchone()[0]

    # Source breakdown
    cur.execute("""
        SELECT source, COUNT(*) FROM "Work"
        WHERE source IN ('tienve','gioo','ttvnol')
        GROUP BY source ORDER BY COUNT(*) DESC
    """)
    source_rows = cur.fetchall()

    cur.close()
    conn.close()

    print("=" * 60)
    print("  ✅ Phase 6 hoàn thành!")
    print(f"     Works:   {works_before:,} → {works_after:,} (+{works_after - works_before:,})")
    print(f"     Chunks:  {chunks_before:,} → {chunks_after:,} (+{chunks_after - chunks_before:,})")
    print(f"     Vectors: {with_vectors:,}")
    print(f"     Theo nguồn (forum):")
    for row in source_rows:
        print(f"       {row[0]}: {row[1]:,}")
    print("=" * 60)


if __name__ == '__main__':
    main()
