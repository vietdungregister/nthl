#!/usr/bin/env python3
"""
apply-clean-to-db.py — Patch cleaned content/title/excerpt vào Production DB
=============================================================================
Dùng sau khi clean-data.py chạy xong. Chỉ update các bài có thay đổi.
"""
import json, os, sys, time
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
    import psycopg2
    from psycopg2.extras import execute_values

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "output" / "data"

def load_db_url():
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        for line in open(env_file):
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("DATABASE_URL", "")

def main():
    db_url = load_db_url()
    if not db_url:
        print("❌ DATABASE_URL not found in .env")
        sys.exit(1)

    print("📂 Loading clean works...")
    with open(DATA_DIR / "works_clean.json") as f:
        fb_works = json.load(f)
    with open(DATA_DIR / "forum_works_clean.json") as f:
        forum_works = json.load(f)

    all_works = {w["id"]: w for w in fb_works + forum_works}
    print(f"   Total: {len(all_works)} works")

    print("📂 Loading changelog...")
    with open(DATA_DIR / "cleaning_changelog.json") as f:
        changelog = json.load(f)

    ids_to_update = set(c["work_id"] for c in changelog)
    works_to_update = [w for wid, w in all_works.items() if wid in ids_to_update]
    print(f"   Works to update: {len(works_to_update)}")

    print(f"\n🔌 Connecting to DB...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # Check current count
    cur.execute('SELECT COUNT(*) FROM "Work"')
    total_in_db = cur.fetchone()[0]
    print(f"   Works in DB: {total_in_db}")

    print(f"\n⚙️  Applying updates in batches of 500...")
    updated = 0
    BATCH = 500

    for i in range(0, len(works_to_update), BATCH):
        batch = works_to_update[i:i+BATCH]
        for w in batch:
            cur.execute(
                '''UPDATE "Work" SET
                    title = %s,
                    content = %s,
                    excerpt = %s,
                    genre = %s,
                    status = %s
                WHERE id = %s''',
                (
                    w.get("title"),
                    w.get("content"),
                    w.get("excerpt"),
                    w.get("genre", "stt"),
                    w.get("status", "published"),
                    w["id"],
                )
            )
        conn.commit()
        updated += len(batch)
        pct = updated / len(works_to_update) * 100
        print(f"  [{pct:5.1f}%] {updated}/{len(works_to_update)} updated")

    # Also apply soft-deletes (tam_xoa)
    print("\n🗑️  Applying soft-deletes (tam_xoa)...")
    deleted = 0
    for w in fb_works + forum_works:
        if w.get("status") == "tam_xoa":
            cur.execute(
                '''UPDATE "Work" SET "deletedAt" = NOW(), "deleteNote" = %s WHERE id = %s AND "deletedAt" IS NULL''',
                (w.get("deleteNote", "Cleaned: empty/invalid content"), w["id"])
            )
            deleted += cur.rowcount
    conn.commit()
    print(f"   Soft-deleted: {deleted} works")

    cur.close()
    conn.close()

    print(f"\n✅ Done! Updated {updated} works, soft-deleted {deleted}.")

if __name__ == "__main__":
    main()
