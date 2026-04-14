#!/usr/bin/env python3
"""
parse-forum-works.py — Phase 2: Parse & Clean raw JSON → forum_works.json
==========================================================================
Đọc 4 file raw từ output/crawled/, chuẩn hoá thành format works.json
Output: output/data/forum_works.json
"""

import json, re, uuid, unicodedata
from pathlib import Path
from datetime import datetime, timezone

BASE_DIR = Path(__file__).parent.parent.parent
CRAWLED_DIR = BASE_DIR / "output" / "crawled"
DATA_DIR = BASE_DIR / "output" / "data"
OUTPUT_FILE = DATA_DIR / "forum_works.json"
TODAY_ISO = datetime.now(timezone.utc).isoformat()

RAW_FILES = [
    CRAWLED_DIR / "tienve_raw.json",
    CRAWLED_DIR / "gioo_raw.json",
    CRAWLED_DIR / "ttvnol_221106_raw.json",
    CRAWLED_DIR / "ttvnol_51077_raw.json",
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def vn_slugify(text, max_length=80):
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s-]+', '-', text).strip('-')
    return text[:max_length]


def make_unique_slug(slug, seen_slugs):
    original = slug
    counter = 2
    while slug in seen_slugs:
        slug = f"{original}-{counter}"
        counter += 1
    seen_slugs.add(slug)
    return slug


def auto_title(text, date_str=""):
    """Dòng đầu tiên có >= 3 ký tự, tối đa 80 ký tự."""
    for line in text.split('\n'):
        line = line.strip()
        if len(line) >= 3:
            return line[:80] + ('...' if len(line) > 80 else '')
    return f"Bài viết {date_str}" if date_str else "Bài viết"


def clean_content(text):
    """Làm sạch HTML còn sót, signature blocks, normalize whitespace."""
    if not text:
        return ''
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Remove blog/yahoo sig
    text = re.sub(r'http://blog\.360\.yahoo\.com\S*', '', text)
    # Remove [black], [/black] etc (old forum BBcode)
    text = re.sub(r'\[/?[a-z]+[^\]]*\]', '', text, flags=re.IGNORECASE)
    # Normalize unicode spaces
    text = text.replace('\xa0', ' ').replace('\u200b', '')
    # Collapse multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Strip leading/trailing
    return text.strip()


def map_tienve_genre(genre_hint):
    """Map genre hint từ tienve → DB genre."""
    hint = genre_hint.lower()
    if 'thơ' in hint:
        return 'poem'
    if 'truyện' in hint or 'tuỳ bút' in hint or 'tùy bút' in hint:
        return 'essay'
    if 'tiểu luận' in hint or 'nhận định' in hint:
        return 'essay'
    return None  # cần AI classify


def ensure_date(date_val, source):
    """
    Đảm bảo date không bao giờ null.
    - Nếu có date → dùng
    - Nếu tienve/gioo không có → dùng ngày hiện tại (sẽ note needsDateEstimate)
    """
    if date_val:
        return date_val, False
    # Fallback: today
    return TODAY_ISO, True


# ── Main Processing ──────────────────────────────────────────────────────────

def process_raw_file(raw_file):
    """Đọc một file raw JSON và convert sang list of work dicts."""
    if not raw_file.exists():
        print(f"  ⚠️  Không tìm thấy {raw_file.name} — skip")
        return []

    items = json.loads(raw_file.read_text(encoding='utf-8'))
    print(f"  📂 {raw_file.name}: {len(items)} items")

    works = []
    for item in items:
        source = item.get('source', 'unknown')
        content_raw = item.get('content', '')
        content = clean_content(content_raw)

        if not content or len(content.strip()) < 10:
            continue  # Skip empty

        # Date handling: never null
        date_raw, needs_date_estimate = ensure_date(
            item.get('publishedAt'),
            source
        )

        # Title
        title_raw = item.get('title', '')
        # For ttvnol, title comes from content
        if source == 'ttvnol' or not title_raw:
            title = auto_title(content, date_raw[:10] if date_raw else '')
        else:
            title = title_raw[:80]

        if not title:
            title = f"Bài viết từ {source}"

        # Genre mapping
        genre_hint = item.get('genreHint', '')
        if source == 'tienve' and genre_hint:
            genre = map_tienve_genre(genre_hint)
            needs_classification = genre is None
            if genre is None:
                genre = 'stt'  # default, AI sẽ classify lại
        else:
            genre = None
            needs_classification = True

        # Excerpt
        excerpt = content[:200].replace('\n', ' ')
        if len(content) > 200:
            excerpt += '...'

        work = {
            'id': str(uuid.uuid4()),
            'title': title,
            'slug': '',  # will be filled below
            'genre': genre or 'stt',
            'content': content,
            'excerpt': excerpt,
            'status': 'published',
            'publishedAt': date_raw,
            'writtenAt': date_raw,
            'source': source,
            'sourceUrl': item.get('sourceUrl', ''),
            'autoClassified': True,
            'needsGenreClassification': needs_classification,
            'needsDateEstimate': needs_date_estimate,
            # Extra metadata
            '_genreHint': genre_hint,
            '_topicId': item.get('topicId', ''),
        }
        works.append(work)

    print(f"    → {len(works)} works sau filter")
    return works


def main():
    print("=" * 60)
    print("  Phase 2: Parse & Clean → forum_works.json")
    print("=" * 60)
    print()

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    all_works = []
    for raw_file in RAW_FILES:
        works = process_raw_file(raw_file)
        all_works.extend(works)

    print(f"\n  Tổng: {len(all_works)} works raw")

    # Generate unique slugs
    seen_slugs = set()
    for w in all_works:
        slug_base = vn_slugify(w['title'])
        if not slug_base:
            slug_base = f"bai-viet-{w['source']}"
        slug = make_unique_slug(slug_base, seen_slugs)
        w['slug'] = slug[:499]  # max 499 chars (DB limit 500)

    # Stats
    needs_genre = sum(1 for w in all_works if w['needsGenreClassification'])
    needs_date  = sum(1 for w in all_works if w['needsDateEstimate'])
    by_source   = {}
    by_genre    = {}
    for w in all_works:
        by_source[w['source']] = by_source.get(w['source'], 0) + 1
        by_genre[w['genre']]   = by_genre.get(w['genre'], 0) + 1

    # Save
    OUTPUT_FILE.write_text(
        json.dumps(all_works, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )

    print()
    print("=" * 60)
    print("  ✅ Phase 2 hoàn thành!")
    print(f"     Tổng works: {len(all_works)}")
    print(f"     Cần AI classify genre: {needs_genre}")
    print(f"     Dùng ngày hôm nay (không có ngày gốc): {needs_date}")
    print(f"     Theo nguồn:")
    for s, c in sorted(by_source.items()):
        print(f"       {s}: {c}")
    print(f"     Theo genre (trước AI classify):")
    for g, c in sorted(by_genre.items(), key=lambda x: -x[1]):
        print(f"       {g}: {c}")
    print(f"     Output: {OUTPUT_FILE.relative_to(BASE_DIR)}")
    print("=" * 60)


if __name__ == '__main__':
    main()
