#!/usr/bin/env python3
"""
link_media.py — Link ảnh/video từ Facebook JSON vào coverImageUrl trong DB
============================================================================
Đọc lại works.json, lấy URI ảnh/video từ attachments,
copy file vào public/uploads/, update coverImageUrl trong DB.

Cách chạy:
  python3 scripts/link_media.py
"""

import json, os, sys, shutil, time
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
    import psycopg2
    from psycopg2.extras import execute_values

# ── Config ────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent
FB_DIR      = BASE_DIR / "facebook-nguyenthehoanglinh-06_03_2026-y1cYzpJi/your_facebook_activity"
POSTS_DIR   = FB_DIR / "posts"
DATA_DIR    = BASE_DIR / "output" / "data"
WORKS_FILE  = DATA_DIR / "works.json"
PUBLIC_DIR  = BASE_DIR / "public" / "uploads" / "fb"

BATCH_SIZE = 200

# ── Helpers ───────────────────────────────────────────────────────────────────
def decode_fb(text):
    if not text: return ""
    try: return text.encode('latin-1').decode('utf-8')
    except: return text

def load_db_url():
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        for line in open(env_file):
            if line.startswith("DATABASE_URL="):
                return line.strip().split("=", 1)[1].strip('"').strip("'")
    return os.environ.get("DATABASE_URL")

def batched(items, n):
    for i in range(0, len(items), n):
        yield items[i:i+n]

# ── Extract media URI from post ────────────────────────────────────────────────
def extract_media_uri(post_raw):
    """Trả về (uri, type) từ post JSON gốc."""
    for att in post_raw.get('attachments', []):
        for item in att.get('data', []):
            if 'media' in item:
                media = item['media']
                uri = media.get('uri', '')
                if uri:
                    is_video = uri.endswith('.mp4') or 'videos' in uri
                    return uri, 'video' if is_video else 'image'
    return None, None

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  Link Media — Gắn ảnh/video vào Works")
    print("=" * 60); print()

    # Tạo thư mục public/uploads/fb
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    db_url = load_db_url()
    conn   = psycopg2.connect(db_url)
    cur    = conn.cursor()
    print("✅ Connected\n")

    # Load posts gốc từ JSON để lấy attachments
    print("📂 Đọc Facebook JSON posts...")
    all_posts_raw = {}
    for i in range(1, 8):
        path = POSTS_DIR / f"your_posts__check_ins__photos_and_videos_{i}.json"
        if not path.exists(): continue
        data = json.load(open(path, encoding='utf-8'))
        for post in data:
            ts = post.get('timestamp', 0)
            all_posts_raw[ts] = post
    print(f"   {len(all_posts_raw):,} posts raw\n")

    # Load works.json để map id → fbTimestamp
    print("📂 Đọc works.json...")
    works = json.load(open(WORKS_FILE, encoding='utf-8'))
    ts_to_id = {w['fbTimestamp']: w['id'] for w in works if w.get('fbTimestamp')}
    print(f"   {len(ts_to_id):,} works có fbTimestamp\n")

    # Process
    updates = []  # (coverImageUrl, workId)
    copied  = 0
    missing = 0
    skipped = 0

    FB_EXPORT = BASE_DIR / "facebook-nguyenthehoanglinh-06_03_2026-y1cYzpJi"

    print("🔗 Xử lý ảnh/video...")
    for ts, post_raw in all_posts_raw.items():
        work_id = ts_to_id.get(ts)
        if not work_id:
            skipped += 1
            continue

        uri, media_type = extract_media_uri(post_raw)
        if not uri:
            continue

        # Bỏ qua CDN URLs (https://...) — đã expired
        if uri.startswith('http'):
            skipped += 1
            continue

        # URI local: "your_facebook_activity/posts/media/..." 
        src_path = FB_EXPORT / uri

        if not src_path.exists():
            missing += 1
            continue

        # Copy vào public/uploads/fb/
        dest_name = src_path.name
        dest_path = PUBLIC_DIR / dest_name

        if not dest_path.exists():
            try:
                shutil.copy2(src_path, dest_path)
                copied += 1
            except Exception:
                missing += 1
                continue

        # URL để serve qua Next.js
        cover_url = f"/uploads/fb/{dest_name}"
        updates.append((cover_url, work_id))

    print(f"   Có ảnh/video: {len(updates):,}")
    print(f"   Đã copy: {copied:,}")
    print(f"   Missing: {missing:,}")
    print(f"   Skip (không có work): {skipped:,}\n")

    # Batch UPDATE trong DB
    print(f"💾 Update coverImageUrl trong DB...")
    updated = 0
    for batch in batched(updates, BATCH_SIZE):
        for cover_url, work_id in batch:
            cur.execute(
                'UPDATE "Work" SET "coverImageUrl" = %s WHERE id = %s',
                (cover_url, work_id)
            )
        conn.commit()
        updated += len(batch)
        print(f"   {updated:,}/{len(updates):,}")

    # Stats
    cur.execute("SELECT COUNT(*) FROM \"Work\" WHERE \"coverImageUrl\" IS NOT NULL AND \"coverImageUrl\" != ''")
    total_with_img = cur.fetchone()[0]

    cur.close(); conn.close()

    print()
    print("=" * 60)
    print("  ✅ HOÀN THÀNH!")
    print(f"     Works có ảnh: {total_with_img:,}")
    print(f"     Files copied: {copied:,}")
    print(f"     → /public/uploads/fb/")
    print("=" * 60)

if __name__ == '__main__':
    main()
