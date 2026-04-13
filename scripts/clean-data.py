#!/usr/bin/env python3
"""
clean-data.py — NTHL Data Cleaning Pipeline
=============================================
Làm sạch HOÀN TOÀN toàn bộ dữ liệu nguồn JSON.

Triết lý: Làm perfect MỘT LẦN. Bắt nhầm còn hơn bỏ sót.

Cách chạy:
  # Chỉ audit (không sửa gì):
  python3 scripts/clean-data.py --audit-only

  # Chạy toàn bộ pipeline:
  python3 scripts/clean-data.py

  # Chạy từ phase cụ thể (resume sau khi bị interrupt):
  python3 scripts/clean-data.py --from-phase 3
"""

from __future__ import annotations
import json, re, html, sys, time, os, shutil, uuid, difflib, argparse
from pathlib import Path
from datetime import datetime
from collections import Counter
from typing import Optional

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR         = Path(__file__).parent.parent
DATA_DIR         = BASE_DIR / "output" / "data"
BACKUP_DIR       = DATA_DIR / "backup"
WORKS_FILE       = DATA_DIR / "works.json"
FORUM_FILE       = DATA_DIR / "forum_works.json"
CHUNKS_FILE      = DATA_DIR / "chunks.json"

REPORT_FILE      = DATA_DIR / "cleaning_report.json"
CHANGELOG_FILE   = DATA_DIR / "cleaning_changelog.json"
QUALITY_FILE     = DATA_DIR / "quality_fixes.json"
GENRE_LOG_FILE   = DATA_DIR / "genre_changelog.json"

WORKS_CLEAN      = DATA_DIR / "works_clean.json"
FORUM_CLEAN      = DATA_DIR / "forum_works_clean.json"
CHUNKS_CLEAN     = DATA_DIR / "chunks_clean.json"

# Checkpoint files để resume nếu bị interrupt
CKPT_QUALITY     = DATA_DIR / "ckpt_quality.json"
CKPT_GENRE       = DATA_DIR / "ckpt_genre.json"

BATCH_SIZE       = 20
DELAY_SEC        = 0.5
VN_CHARS         = 'àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ'


# ── Helpers ───────────────────────────────────────────────────────────────────
def load_env_key(key: str) -> str | None:
    for env_file in [BASE_DIR / ".env.local", BASE_DIR / ".env"]:
        if env_file.exists():
            for line in open(env_file):
                line = line.strip()
                if line.startswith(f"{key}="):
                    return line.split("=", 1)[1].strip('"').strip("'")
    return os.environ.get(key)


def load_json(path: Path) -> list:
    print(f"  📂 Đọc {path.name}...")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    print(f"     → {len(data):,} items")
    return data


def save_json(data, path: Path, label: str = ""):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    size_mb = path.stat().st_size / 1024 / 1024
    print(f"  💾 {label or path.name}: {len(data):,} items ({size_mb:.1f} MB)")


def batched(items, n):
    for i in range(0, len(items), n):
        yield items[i:i+n]


def load_checkpoint(path: Path) -> dict:
    if path.exists():
        return json.load(open(path))
    return {}


def save_checkpoint(data: dict, path: Path):
    json.dump(data, open(path, "w"))


# ── Phase 1: Audit ────────────────────────────────────────────────────────────
def audit_text(text: str) -> list[str]:
    """Trả về list các issue types tìm thấy trong text."""
    issues = []
    if not text:
        return issues
    if '\r' in text:               issues.append('carriage_return')
    if '\t' in text:               issues.append('tab_chars')
    if '\n\n\n' in text:           issues.append('excessive_newlines')
    if re.search(r'^[ \t]+\S', text, re.MULTILINE): issues.append('leading_whitespace')
    if re.search(r'[ \t]+$', text, re.MULTILINE):   issues.append('trailing_whitespace')
    if '  ' in text:               issues.append('duplicate_spaces')
    if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', text): issues.append('control_chars')
    if re.search(r'[\u200b\u200c\u200d\ufeff\u200e\u200f]', text): issues.append('zero_width')
    if re.search(r'[\uff01-\uff5e]', text):          issues.append('fullwidth_chars')
    if re.search(r'&(?:amp|lt|gt|quot|nbsp|apos);', text): issues.append('html_entities')
    # Split Vietnamese heuristic
    split_re = re.compile(f'(?:^|(?<= ))[bcdfghjklmnpqrstvwxyz\u0111]{{1,2}} [{VN_CHARS}]', re.MULTILINE)
    if split_re.search(text):      issues.append('split_vietnamese')
    # Whitespace-only lines
    for line in text.split('\n'):
        if line and line.strip() == '':
            issues.append('whitespace_only_lines')
            break
    return issues


def run_audit(works: list, forum: list) -> dict:
    print("\n" + "="*60)
    print("  BƯỚC 1: AUDIT")
    print("="*60)

    all_works = works + forum
    issue_counts = Counter()
    issue_samples = {}
    empty_prose = []

    for w in all_works:
        wid = w.get('id', '')[:8]
        # Check all text fields
        for field in ('title', 'content', 'excerpt'):
            val = w.get(field, '') or ''
            issues = audit_text(val)
            for issue in issues:
                issue_counts[issue] += 1
                if issue not in issue_samples:
                    issue_samples[issue] = []
                if len(issue_samples[issue]) < 3:
                    issue_samples[issue].append({
                        'id': wid, 'field': field,
                        'preview': repr(val[:80])
                    })

        # Empty content for non-media
        if w.get('genre') not in ('photo', 'video'):
            if not (w.get('content') or '').strip():
                issue_counts['empty_content_prose'] += 1
                empty_prose.append({'id': wid, 'title': w.get('title', '')[:60], 'source': w.get('source')})

    # Cross-source slug duplicates
    fb_slugs = {w['slug'] for w in works}
    forum_slugs = [w['slug'] for w in forum]
    dup_slugs = [s for s in forum_slugs if s in fb_slugs]
    issue_counts['cross_source_slug_dup'] = len(dup_slugs)

    print(f"\n  📊 Tổng: {len(all_works):,} works ({len(works):,} FB + {len(forum):,} forum)")
    print(f"\n  {'Issue':<30} {'Count':>7}")
    print(f"  {'-'*40}")
    for issue, count in sorted(issue_counts.items(), key=lambda x: -x[1]):
        bar = '█' * min(20, int(count / max(issue_counts.values()) * 20))
        print(f"  {issue:<30} {count:>7}  {bar}")

    report = {
        'timestamp': datetime.now().isoformat(),
        'phase': 'audit',
        'total_works': len(all_works),
        'fb_works': len(works),
        'forum_works': len(forum),
        'issue_counts': dict(issue_counts),
        'issue_samples': issue_samples,
        'empty_prose_list': empty_prose,
        'cross_source_slug_dups': len(dup_slugs),
    }

    save_json(report, REPORT_FILE, "cleaning_report.json")
    print(f"\n  ✅ Audit hoàn thành")
    return report


# ── Phase 2: Regex Clean ──────────────────────────────────────────────────────
def clean_text(text: str) -> str:
    """11-step regex cleanup. Không thay đổi nội dung, chỉ fix format."""
    if not text:
        return text

    # 1. Control chars
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # 2. Zero-width
    text = re.sub(r'[\u200b\u200c\u200d\ufeff\u200e\u200f]', '', text)
    # 3. Line endings
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    # 4. Tabs
    text = text.replace('\t', ' ')
    # 5. Leading whitespace per line
    text = re.sub(r'^[ \t]+', '', text, flags=re.MULTILINE)
    # 6. Trailing whitespace per line
    text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)
    # 7. Duplicate spaces
    text = re.sub(r' {2,}', ' ', text)
    # 8. Whitespace-only lines
    text = re.sub(r'\n[ \t]+\n', '\n\n', text)
    # 9. Excessive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    # 10. HTML entities
    text = html.unescape(text)
    # 11. Fullwidth → ASCII
    chars = []
    for ch in text:
        cp = ord(ch)
        chars.append(chr(cp - 0xFEE0) if 0xFF01 <= cp <= 0xFF5E else ch)
    text = ''.join(chars)

    return text.strip()


def run_regex_clean(works: list, forum: list) -> tuple[list, list, list]:
    print("\n" + "="*60)
    print("  BƯỚC 2: REGEX CLEAN")
    print("="*60)

    changelog = []
    total_changed = 0

    def clean_work(w: dict) -> dict:
        nonlocal total_changed
        changed = False
        for field in ('title', 'content', 'excerpt'):
            original = w.get(field) or ''
            cleaned = clean_text(original)
            if cleaned != original:
                changelog.append({
                    'work_id': w.get('id', '')[:8],
                    'field': field,
                    'change_type': 'regex_cleanup',
                    'before_len': len(original),
                    'after_len': len(cleaned),
                })
                w[field] = cleaned
                changed = True
        if changed:
            total_changed += 1
        return w

    print(f"\n  🔧 Cleaning {len(works):,} FB works...")
    works = [clean_work(w) for w in works]

    print(f"  🔧 Cleaning {len(forum):,} forum works...")
    forum = [clean_work(w) for w in forum]

    print(f"\n  ✅ {total_changed:,} works changed | {len(changelog):,} field changes")

    save_json(changelog, CHANGELOG_FILE, "cleaning_changelog.json")
    return works, forum, changelog


# ── Phase 3: GPT-4o Quality Check ────────────────────────────────────────────
QUALITY_SYSTEM = """Bạn là chuyên gia kiểm tra chất lượng văn bản tiếng Việt.

Kiểm tra mỗi bài và trả về JSON array:
[{
  "id": "...",
  "has_issues": true/false,
  "issues": ["split_vietnamese", "encoding_error", "garbled_text", "other"],
  "fixed_title": "..." hoặc null,
  "fixed_content": "..." hoặc null
}]

Các lỗi cần tìm:
1. Từ tiếng Việt bị tách do crawl web: "s ống" → "sống", "CHUYỆ N" → "CHUYỆN", "th iên" → "thiên"
2. Ký tự encoding sai (mojibake)
3. Text bị garbled (ký tự ngẫu nhiên, không đọc được)
4. Bất kỳ lỗi kỹ thuật nào ảnh hưởng chất lượng đọc

KHÔNG thay đổi nội dung, ý nghĩa, hay phong cách.
KHÔNG sửa lỗi chính tả thông thường.
Chỉ sửa lỗi kỹ thuật do crawl/encoding.
Nếu không có lỗi, trả has_issues: false, fixed_content: null."""

GENRE_SYSTEM = """Bạn là chuyên gia phân loại thể loại văn học Việt Nam.
Tác giả: Nguyễn Thế Hoàng Linh — nhà thơ nổi tiếng, đặc trưng:
- Thơ ngắn 1-4 dòng, triết lý nhẹ nhàng, hài hước
- Thơ tự do, lục bát biến thể, wordplay, chơi chữ
- Thơ trên Facebook thường không có tiêu đề rõ ràng
- Nhiều bài 1-2 dòng vẫn là THƠ nếu có nhịp điệu, hình ảnh, ẩn dụ

Phân loại mỗi bài:
- "poem": thơ, vè, lục bát, thơ tự do, thơ triết lý, thơ hài, câu thơ 1-2 dòng có chất thơ
- "stt": status thường, nhận xét cá nhân, quảng cáo, thông báo, chia sẻ link, hỏi đáp, tin tức
- "photo": nội dung gắn với ảnh, caption ảnh ngắn hoặc không có text
- "video": nội dung gắn với video

Trả về JSON array:
[{"id": "...", "genre": "poem|stt|photo|video", "confidence": 0.0-1.0}]

Nếu không chắc chắn (ranh giới thơ/status mờ nhạt), cho confidence < 0.8.
Confidence < 0.8 → sẽ được đánh "ton_nghi" để tác giả review tay."""


def gpt4o_batch(client, messages: list, phase_label: str) -> list | None:
    """Gọi GPT-4o và parse JSON response. Retry 2 lần nếu fail."""
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model="gpt-4o",
                temperature=0,
                max_tokens=4000,
                messages=messages,
            )
            raw = resp.choices[0].message.content or ''
            # Extract JSON array
            match = re.search(r'\[.*\]', raw, re.DOTALL)
            if match:
                return json.loads(match.group())
            # Try entire response
            return json.loads(raw)
        except Exception as e:
            print(f"    ⚠️  [{phase_label}] Attempt {attempt+1}/3 failed: {e}")
            if attempt < 2:
                time.sleep(2 ** attempt)
    return None


def run_quality_check(works: list, forum: list) -> tuple[list, list, list]:
    print("\n" + "="*60)
    print("  BƯỚC 3: GPT-4o QUALITY CHECK (toàn bộ 25K works)")
    print("="*60)

    try:
        from openai import OpenAI
    except ImportError:
        print("  ⚠️  openai chưa cài. Chạy: pip install openai")
        sys.exit(1)

    api_key = load_env_key("OPENAI_API_KEY")
    if not api_key:
        print("  ❌ OPENAI_API_KEY không tìm thấy")
        sys.exit(1)

    client = OpenAI(api_key=api_key)
    all_works = works + forum  # Process together
    quality_fixes = []

    # Load checkpoint
    ckpt = load_checkpoint(CKPT_QUALITY)
    done_ids = set(ckpt.get('done_ids', []))
    print(f"  📌 Checkpoint: {len(done_ids):,} works đã xử lý")

    remaining = [w for w in all_works if w['id'] not in done_ids]
    total = len(all_works)
    processed = len(done_ids)
    fixed_count = 0

    print(f"  🔍 Còn lại: {len(remaining):,} works cần check")

    # Create lookup map
    work_map = {w['id']: w for w in all_works}

    for batch_num, batch in enumerate(batched(remaining, BATCH_SIZE)):
        # Build prompt
        entries = []
        for w in batch:
            content_preview = (w.get('content') or '')[:600]
            entries.append(
                f'ID: {w["id"]}\n'
                f'Title: {w.get("title","")[:100]}\n'
                f'Content: {content_preview}'
            )
        user_msg = '\n---\n'.join(entries)

        results = gpt4o_batch(client, [
            {'role': 'system', 'content': QUALITY_SYSTEM},
            {'role': 'user', 'content': user_msg},
        ], 'quality')

        if results:
            for r in results:
                wid = r.get('id')
                if not wid or wid not in work_map:
                    continue
                w = work_map[wid]
                if r.get('has_issues'):
                    fix_entry = {
                        'id': wid,
                        'title': w.get('title', '')[:60],
                        'issues': r.get('issues', []),
                        'fixed_title': r.get('fixed_title'),
                        'fixed_content': r.get('fixed_content'),
                    }
                    quality_fixes.append(fix_entry)
                    # Apply fixes
                    if r.get('fixed_title'):
                        w['title'] = r['fixed_title']
                        fix_entry['original_title'] = w.get('title', '')
                    if r.get('fixed_content'):
                        w['content'] = r['fixed_content']
                        fix_entry['original_content_preview'] = (w.get('content') or '')[:100]
                    fixed_count += 1
        else:
            # API failed — skip batch, mark as done to not retry forever
            print(f"    ⚠️  Batch {batch_num+1} failed entirely, skipping")

        processed += len(batch)
        for w in batch:
            done_ids.add(w['id'])

        # Progress
        pct = processed / total * 100
        if (batch_num + 1) % 10 == 0 or batch_num == 0:
            print(f"  [{pct:5.1f}%] {processed:,}/{total:,} | Fixed: {fixed_count}")

        # Checkpoint every 50 batches
        if (batch_num + 1) % 50 == 0:
            save_checkpoint({'done_ids': list(done_ids)}, CKPT_QUALITY)

        time.sleep(DELAY_SEC)

    # Final checkpoint clear
    if CKPT_QUALITY.exists():
        CKPT_QUALITY.unlink()

    save_json(quality_fixes, QUALITY_FILE, "quality_fixes.json")
    print(f"\n  ✅ Quality check hoàn thành: {fixed_count} works đã fix")

    # Split back
    works_ids = {w['id'] for w in works}
    works_out = [work_map[w['id']] for w in works]
    forum_out = [work_map[w['id']] for w in forum]
    return works_out, forum_out, quality_fixes


# ── Phase 4: GPT-4o Genre Classification ─────────────────────────────────────
def run_genre_classify(works: list, forum: list) -> tuple[list, list, list]:
    print("\n" + "="*60)
    print("  BƯỚC 4: GPT-4o GENRE CLASSIFICATION (toàn bộ 25K works)")
    print("="*60)

    try:
        from openai import OpenAI
    except ImportError:
        print("  ⚠️  openai chưa cài. Chạy: pip install openai")
        sys.exit(1)

    api_key = load_env_key("OPENAI_API_KEY")
    client = OpenAI(api_key=api_key)

    all_works = works + forum
    genre_changelog = []

    # Load checkpoint
    ckpt = load_checkpoint(CKPT_GENRE)
    done_ids = set(ckpt.get('done_ids', []))
    print(f"  📌 Checkpoint: {len(done_ids):,} works đã xử lý")

    remaining = [w for w in all_works if w['id'] not in done_ids]
    total = len(all_works)
    processed = len(done_ids)

    work_map = {w['id']: w for w in all_works}

    changed_count = 0
    uncertain_count = 0

    print(f"  🎭 Còn lại: {len(remaining):,} works cần classify")

    for batch_num, batch in enumerate(batched(remaining, BATCH_SIZE)):
        entries = []
        for w in batch:
            content_preview = (w.get('content') or '')[:500]
            entries.append(
                f'ID: {w["id"]}\n'
                f'Title: {w.get("title","")[:100]}\n'
                f'Current genre: {w.get("genre","?")}\n'
                f'Content: {content_preview}'
            )
        user_msg = '\n---\n'.join(entries)

        results = gpt4o_batch(client, [
            {'role': 'system', 'content': GENRE_SYSTEM},
            {'role': 'user', 'content': user_msg},
        ], 'genre')

        if results:
            for r in results:
                wid = r.get('id')
                if not wid or wid not in work_map:
                    continue
                w = work_map[wid]
                old_genre = w.get('genre', '?')
                confidence = float(r.get('confidence', 0.5))
                ai_genre = r.get('genre', 'stt')

                # Three-way mapping
                if confidence >= 0.8:
                    new_genre = ai_genre
                else:
                    new_genre = 'ton_nghi'
                    uncertain_count += 1

                # Log all changes (even no change — to track what AI saw)
                if old_genre != new_genre:
                    genre_changelog.append({
                        'id': wid,
                        'title': w.get('title', '')[:60],
                        'old_genre': old_genre,
                        'new_genre': new_genre,
                        'ai_genre': ai_genre,
                        'ai_confidence': confidence,
                        'content_preview': (w.get('content') or '')[:100],
                    })
                    w['genre'] = new_genre
                    changed_count += 1

                # Store AI metadata
                w['aiGenre'] = ai_genre
                w['aiConfidence'] = confidence
                done_ids.add(wid)

        processed += len(batch)
        pct = processed / total * 100
        if (batch_num + 1) % 10 == 0 or batch_num == 0:
            print(f"  [{pct:5.1f}%] {processed:,}/{total:,} | Changed: {changed_count} | Uncertain: {uncertain_count}")

        if (batch_num + 1) % 50 == 0:
            save_checkpoint({'done_ids': list(done_ids)}, CKPT_GENRE)

        time.sleep(DELAY_SEC)

    if CKPT_GENRE.exists():
        CKPT_GENRE.unlink()

    save_json(genre_changelog, GENRE_LOG_FILE, "genre_changelog.json")
    print(f"\n  ✅ Genre classify hoàn thành: {changed_count} changed | {uncertain_count} ton_nghi")

    works_out = [work_map[w['id']] for w in works]
    forum_out = [work_map[w['id']] for w in forum]
    return works_out, forum_out, genre_changelog


# ── Phase 5: Structural Cleanup ───────────────────────────────────────────────
def run_structural_cleanup(works: list, forum: list) -> tuple[list, list]:
    print("\n" + "="*60)
    print("  BƯỚC 5: STRUCTURAL CLEANUP")
    print("="*60)

    # 5A. Soft-delete empty prose
    soft_deleted = 0
    for w in works + forum:
        if w.get('genre') not in ('photo', 'video'):
            if not (w.get('content') or '').strip():
                w['status'] = 'tam_xoa'
                w['deleteReason'] = 'empty_content_prose'
                w['deleteNote'] = 'Prose/status/poem có content rỗng (FB activity: shared/updated/reel)'
                soft_deleted += 1
    print(f"\n  🗑️  Soft-deleted {soft_deleted} empty prose works")

    # 5B. Dedup cross-source slugs
    fb_slug_map = {w['slug']: w for w in works}
    deduped = 0
    kept_both = 0

    for fw in forum:
        slug = fw.get('slug', '')
        if slug in fb_slug_map:
            fb_w = fb_slug_map[slug]
            # Compare content
            fc = (fw.get('content') or '').strip().lower()
            bc = (fb_w.get('content') or '').strip().lower()
            if fc and bc:
                sim = difflib.SequenceMatcher(None, fc, bc).ratio()
            else:
                sim = 0.0

            if sim >= 0.8:
                # Same work → soft-delete forum version
                fw['status'] = 'tam_xoa'
                fw['deleteReason'] = 'cross_source_duplicate'
                fw['deleteNote'] = f'Duplicate of FB work [{fb_w["slug"]}]. Similarity: {sim:.0%}'
                deduped += 1
            else:
                # Different work, same slug → add suffix
                source = fw.get('source', 'forum')
                fw['slug'] = fw['slug'] + f'-{source}'
                kept_both += 1

    print(f"  🔗 Cross-source dedup: {deduped} soft-deleted | {kept_both} kept with suffix")
    print(f"\n  ✅ Structural cleanup hoàn thành")
    return works, forum


# ── Phase 6: Re-derive ────────────────────────────────────────────────────────
def chunk_work(work: dict) -> list[dict]:
    """Tạo chunks từ content. Copy logic từ build-data.py."""
    text = work.get('content', '')
    if not text:
        return []
    chunks = []
    lines = text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if len(line) < 8:
            i += 1
            continue
        if len(line) > 120:
            for s in re.split(r'(?<=[.!?])\s+', line):
                s = s.strip()
                if len(s) >= 8:
                    chunks.append({'content': s})
            i += 1
            continue
        if len(line) < 60 and i + 1 < len(lines):
            next_line = lines[i+1].strip()
            if len(next_line) >= 8 and len(next_line) < 60:
                chunks.append({'content': f"{line}\n{next_line}"})
                i += 2
                continue
        chunks.append({'content': line})
        i += 1
    return chunks


def run_rederive(works: list, forum: list) -> list:
    print("\n" + "="*60)
    print("  BƯỚC 6: RE-DERIVE (excerpt + chunks)")
    print("="*60)

    all_works = works + forum
    chunks = []
    excerpt_updated = 0

    for w in all_works:
        # Re-generate excerpt
        content = (w.get('content') or '').strip()
        if content:
            new_excerpt = (content[:150] + '...') if len(content) > 150 else content
            if new_excerpt != (w.get('excerpt') or ''):
                w['excerpt'] = new_excerpt
                excerpt_updated += 1

        # Chunk (skip tam_xoa và media)
        if w.get('status') == 'tam_xoa':
            continue
        if w.get('genre') in ('photo', 'video'):
            continue

        raw_chunks = chunk_work(w)
        for c in raw_chunks:
            chunks.append({
                'id': str(uuid.uuid4()),
                'workId': w['id'],
                'workTitle': w.get('title', ''),
                'workSlug': w.get('slug', ''),
                'content': c['content'],
                'score': 0,
                'isBlocked': False,
            })

    print(f"  📝 Excerpts updated: {excerpt_updated:,}")
    print(f"  ✂️  Chunks generated: {len(chunks):,}")
    print(f"  ✅ Re-derive hoàn thành")
    return chunks


# ── Phase 7: Export ───────────────────────────────────────────────────────────
def run_export(works: list, forum: list, chunks: list):
    print("\n" + "="*60)
    print("  BƯỚC 7: EXPORT FILES SẠCH")
    print("="*60)

    # Backup originals
    BACKUP_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    for src, name in [
        (WORKS_FILE, f'works_{ts}.bak'),
        (FORUM_FILE, f'forum_works_{ts}.bak'),
        (CHUNKS_FILE, f'chunks_{ts}.bak'),
    ]:
        if src.exists():
            shutil.copy2(src, BACKUP_DIR / name)
            print(f"  💾 Backup: {name}")

    # Write clean files
    print()
    save_json(works, WORKS_CLEAN, "works_clean.json")
    save_json(forum, FORUM_CLEAN, "forum_works_clean.json")
    save_json(chunks, CHUNKS_CLEAN, "chunks_clean.json")

    # Stats summary
    print(f"\n  📊 STATS CUỐI:")
    all_works = works + forum
    genre_dist = Counter(w.get('genre', '?') for w in all_works)
    tam_xoa = sum(1 for w in all_works if w.get('status') == 'tam_xoa')
    ton_nghi = sum(1 for w in all_works if w.get('genre') == 'ton_nghi')

    for genre, count in genre_dist.most_common():
        print(f"    {genre:<15} {count:>6}")
    print(f"    {'---'}")
    print(f"    {'tam_xoa':<15} {tam_xoa:>6}  (soft-deleted)")
    print(f"    {'ton_nghi':<15} {ton_nghi:>6}  (cần tác giả review)")
    print(f"    {'chunks':<15} {len(chunks):>6}")

    print(f"\n  ✅ Export hoàn thành")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='NTHL Data Cleaning Pipeline')
    parser.add_argument('--audit-only', action='store_true', help='Chỉ audit, không sửa')
    parser.add_argument('--from-phase', type=int, default=1, help='Bắt đầu từ phase (1-7)')
    args = parser.parse_args()

    print("\n" + "="*60)
    print("  NTHL DATA CLEANING PIPELINE")
    print("="*60)

    # Load data
    print("\n📂 Đọc dữ liệu...")
    works = load_json(WORKS_FILE)
    forum = load_json(FORUM_FILE)

    # Phase 1: Audit (always run)
    report = run_audit(works, forum)

    if args.audit_only:
        print("\n✅ Audit-only mode. Không thay đổi gì.")
        return

    from_phase = args.from_phase

    # Phase 2: Regex clean
    if from_phase <= 2:
        works, forum, _ = run_regex_clean(works, forum)

    # Phase 3: GPT-4o Quality Check
    if from_phase <= 3:
        works, forum, _ = run_quality_check(works, forum)

    # Phase 4: GPT-4o Genre Classify
    if from_phase <= 4:
        works, forum, _ = run_genre_classify(works, forum)

    # Phase 5: Structural Cleanup
    if from_phase <= 5:
        works, forum = run_structural_cleanup(works, forum)

    # Phase 6: Re-derive
    if from_phase <= 6:
        chunks = run_rederive(works, forum)
    else:
        chunks = load_json(CHUNKS_CLEAN) if CHUNKS_CLEAN.exists() else []

    # Phase 7: Export
    if from_phase <= 7:
        run_export(works, forum, chunks)

    print("\n" + "="*60)
    print("  ✅ PIPELINE HOÀN THÀNH!")
    print("="*60)
    print(f"""
  Output files:
    ✨ output/data/works_clean.json       ← FB works sạch
    ✨ output/data/forum_works_clean.json ← Forum works sạch
    ✨ output/data/chunks_clean.json      ← Chunks cho search

  Bước tiếp theo:
    python3 scripts/seed_db.py            ← Seed vào PostgreSQL
""")


if __name__ == '__main__':
    main()
