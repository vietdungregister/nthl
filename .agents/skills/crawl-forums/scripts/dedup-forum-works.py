#!/usr/bin/env python3
"""
dedup-forum-works.py — Phase 4: Dedup vs existing DB (fast hash mode)
======================================================================
So sánh forum_works.json với DB hiện có dùng slug + title hash.
Output:
  - forum_works_new.json         (bài chưa có trong DB)
  - forum_works_duplicates.json  (bài trùng + lý do)
"""

import json, os, sys, re, unicodedata
from pathlib import Path

try:
    import psycopg2
except ImportError:
    os.system(f"{sys.executable} -m pip install --break-system-packages psycopg2-binary -q")
    import psycopg2

BASE_DIR   = Path(__file__).parent.parent.parent
DATA_DIR   = BASE_DIR / "output" / "data"
WORKS_FILE = DATA_DIR / "forum_works.json"
NEW_FILE   = DATA_DIR / "forum_works_new.json"
DUPS_FILE  = DATA_DIR / "forum_works_duplicates.json"


def load_db_url():
    env = BASE_DIR / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("DATABASE_URL")


def normalize(text):
    """Lower, bỏ dấu, bỏ punct — để so sánh title O(1)."""
    if not text:
        return ''
    text = text.lower().strip()
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def main():
    print("=" * 60)
    print("  Phase 4: Dedup vs existing DB (fast hash mode)")
    print("=" * 60)
    print()

    forum_works = json.loads(WORKS_FILE.read_text(encoding='utf-8'))
    print(f"  Forum works: {len(forum_works)}")

    db_url = load_db_url()
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    print("  📂 Load existing slugs + titles từ DB...")
    # Chỉ lấy slug + title (không cần content) → rất nhanh
    cur.execute("""
        SELECT slug, title FROM "Work"
        WHERE status='published' AND "deletedAt" IS NULL
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    print(f"  DB: {len(rows)} works")

    # Build hash sets — O(1) lookup
    existing_slugs  = {r[0] for r in rows}
    existing_titles = {normalize(r[1]) for r in rows if r[1]}
    print(f"  Indexing complete\n")

    new_works  = []
    duplicates = []

    for w in forum_works:
        slug       = w.get('slug', '')
        title      = w.get('title', '')
        norm_title = normalize(title)
        match_method = None

        if slug and slug in existing_slugs:
            match_method = 'slug_exact'
        elif norm_title and norm_title in existing_titles:
            match_method = 'title_norm'

        if match_method:
            duplicates.append({
                'newWork': {
                    'title': title,
                    'slug': slug,
                    'source': w.get('source'),
                    'sourceUrl': w.get('sourceUrl'),
                    'content_preview': w.get('content', '')[:150],
                },
                'matchMethod': match_method,
            })
        else:
            new_works.append(w)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    NEW_FILE.write_text(json.dumps(new_works, ensure_ascii=False, indent=2), encoding='utf-8')
    DUPS_FILE.write_text(json.dumps(duplicates, ensure_ascii=False, indent=2), encoding='utf-8')

    print("=" * 60)
    print("  ✅ Phase 4 hoàn thành!")
    print(f"     Tổng forum works:    {len(forum_works)}")
    print(f"     Bài MỚI (import):   {len(new_works)}")
    print(f"     Bài TRÙNG (skip):   {len(duplicates)}")
    if duplicates:
        by_method = {}
        for d in duplicates:
            m = d['matchMethod']
            by_method[m] = by_method.get(m, 0) + 1
        for m, c in by_method.items():
            print(f"       {m}: {c}")
        print(f"     Review: {DUPS_FILE.relative_to(BASE_DIR)}")
    print("=" * 60)


if __name__ == '__main__':
    main()
