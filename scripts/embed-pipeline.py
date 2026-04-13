#!/usr/bin/env python3
"""
embed-pipeline.py — NTHL Smart Embedding Pipeline
===================================================
Pipeline 4 bước để tạo vector embeddings chất lượng cao cho NTHL archive.

Triết lý:
- Smart chunking: thơ ngắn=nguyên bài, thơ dài=theo khổ, văn xuôi=nguyên bài
- GPT-4o describe qua 5 tính thơ của NTHL
- text-embedding-3-large embed (content + description)
- Modular: mỗi bước lưu file riêng → re-run từng bước

Cách chạy:
  python3 scripts/embed-pipeline.py              # Toàn bộ
  python3 scripts/embed-pipeline.py --from-phase 2  # Resume từ phase
  python3 scripts/embed-pipeline.py --from-phase 3  # Re-run describe only

Các bước:
  Phase 1: Two-pass NTHL Style Guide (~$5)
  Phase 2: Smart chunking
  Phase 3: GPT-4o describe (5 tính thơ) (~$40)
  Phase 4: Embed (text-embedding-3-large) (~$1)
"""

from __future__ import annotations
import json, re, os, sys, time, uuid, argparse
from pathlib import Path
from datetime import datetime
from collections import Counter
from typing import Optional

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR       = Path(__file__).parent.parent
DATA_DIR       = BASE_DIR / "output" / "data"

WORKS_CLEAN    = DATA_DIR / "works_clean.json"
FORUM_CLEAN    = DATA_DIR / "forum_works_clean.json"

STYLE_GUIDE    = DATA_DIR / "nthl_style_guide.json"
CHUNKS_CLEAN   = DATA_DIR / "chunks_clean.json"
CHUNKS_DESCRIBED = DATA_DIR / "chunks_described.json"
CHUNKS_EMBEDDED  = DATA_DIR / "chunks_with_embeddings.json"

CKPT_STYLE     = DATA_DIR / "ckpt_style.json"
CKPT_DESCRIBE  = DATA_DIR / "ckpt_describe.json"
CKPT_EMBED     = DATA_DIR / "ckpt_embed.json"

BATCH_SIZE     = 20
EMBED_BATCH    = 100
DELAY_SEC      = 0.5

# ── NTHL Poetic Theory (5 tính thơ) ──────────────────────────────────────────
NTHL_POETIC_THEORY = """
## NTHL'S POETIC THEORY ("5 Tính Thơ" — The 5 Poetic Qualities)

**In Vietnamese (original):**
I. Nghệ thuật là tính thơ
Tính thơ là nội lực của ít nhất một trong các yếu tố sau:
Hình ảnh, ý tưởng, nhạc tính, mạch cảm xúc, tư tưởng
(hoặc đầy đặn và nhất quán, hoặc biến tấu liên tục, tùy theo mỗi tác phẩm).

II. Cấp độ của tính thơ
- Hình ảnh, ý tưởng, nhạc tính, mạch cảm xúc, tư tưởng càng có nội lực và 
  càng hòa quyện thì cấp độ tính thơ càng cao.
- Cấp độ nghệ thuật tỷ lệ thuận với tính thơ — không phải với riêng cái bi, 
  cái hài, cái buồn, cái vui, cái thật, hay cái tưởng tượng...
- Sự hòa quyện của 5 tính thơ như một đội bóng gôn tôm 5 người. 
  Mỗi yếu tố càng phối hợp tốt thì tổng thể càng hay.
- Mạch cảm xúc là linh hồn của tác phẩm. Vẻ đẹp của mạch cảm xúc phụ thuộc 
  vào cái riêng, sự tự thân, và sức lao động.

**In English (translation):**
Art is "tính thơ" (poetic quality). The 5 dimensions of poetic quality are:
1. **Hình ảnh (Imagery)**: The inner power of images, objects, scenes, phenomena
2. **Ý tưởng (Idea/Concept)**: Creative breakthrough, novel perspectives, unexpected angles
3. **Nhạc tính (Musicality)**: Rhythm, sound patterns, cadence, wordplay, phonetic texture
4. **Mạch cảm xúc (Emotional flow)**: The emotional journey, authenticity, personal depth
5. **Tư tưởng (Philosophy/Thought)**: Deep insight, philosophical dimension, life wisdom

The higher the inner power and harmony of these 5 dimensions, the higher the artistic quality.
Quality is NOT proportional to sadness, humor, reality, fantasy, or any single dimension alone.
"""

# ── Helpers ───────────────────────────────────────────────────────────────────
def load_env_key(key: str) -> Optional[str]:
    for env_file in [BASE_DIR / ".env.local", BASE_DIR / ".env"]:
        if env_file.exists():
            for line in open(env_file):
                line = line.strip()
                if line.startswith(f"{key}="):
                    return line.split("=", 1)[1].strip('"').strip("'")
    return os.environ.get(key)


def load_json(path: Path) -> list:
    print(f"  📂 {path.name}...")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    print(f"     → {len(data):,} items")
    return data


def save_json(data, path: Path, label: str = ""):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    size_mb = path.stat().st_size / 1024 / 1024
    label = label or path.name
    print(f"  💾 {label}: {len(data) if isinstance(data, list) else 'dict'} items ({size_mb:.1f} MB)")


def batched(items, n):
    for i in range(0, len(items), n):
        yield items[i:i+n]


def load_ckpt(path: Path) -> dict:
    return json.load(open(path)) if path.exists() else {}


def save_ckpt(data: dict, path: Path):
    json.dump(data, open(path, "w"))


def gpt4o_call(client, messages: list, label: str, max_tokens: int = 4000) -> Optional[str]:
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model="gpt-4o",
                temperature=0,
                max_tokens=max_tokens,
                messages=messages,
            )
            return resp.choices[0].message.content or ''
        except Exception as e:
            print(f"    ⚠️  [{label}] Attempt {attempt+1}/3: {e}")
            if attempt < 2:
                time.sleep(2 ** attempt * 2)
    return None


def gpt4o_json(client, messages: list, label: str) -> Optional[list]:
    raw = gpt4o_call(client, messages, label)
    if not raw:
        return None
    match = re.search(r'\[.*\]', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    try:
        return json.loads(raw)
    except Exception:
        return None


# ── Phase B1: Two-pass NTHL Style Guide ──────────────────────────────────────
STYLE_GUIDE_SYSTEM = """You are a senior Vietnamese literary critic and researcher.

Your task: Read batches of works from Vietnamese poet Nguyễn Thế Hoàng Linh 
and extract observations about his style, recurring themes, and poetic techniques.

Focus on:
- Recurring themes and subjects
- Characteristic writing techniques and structures  
- Tonal range (humor, philosophy, melancholy, wordplay, etc.)
- Unique stylistic signatures
- Common imagery and metaphors

Respond in JSON: {"observations": ["...", "...", ...]} (5-10 specific observations per batch)"""

STYLE_CONSOLIDATE_SYSTEM = """You are a senior Vietnamese literary critic.

You have received observations about the complete works of poet Nguyễn Thế Hoàng Linh.
Synthesize these into a comprehensive "Style Guide" document (600-800 words, 
in Vietnamese + English, structured) that captures:

1. Core poetic identity and voice
2. Recurring themes (with examples)
3. Structural patterns (line length, rhythm, stanza)
4. Tonal signatures (humor, wordplay, philosophy, etc.)
5. Common imagery domains
6. Unique techniques

This guide will be used to help AI analyze individual poems accurately."""


def run_style_guide(client, all_works: list) -> str:
    print("\n" + "="*60)
    print("  PHASE B1: TWO-PASS NTHL STYLE GUIDE")
    print("="*60)

    ckpt = load_ckpt(CKPT_STYLE)
    done_batches = ckpt.get('done_batches', 0)
    all_observations = ckpt.get('observations', [])

    # Load existing style guide if already done
    if STYLE_GUIDE.exists() and not ckpt:
        guide_data = json.load(open(STYLE_GUIDE))
        print(f"  ✅ Style guide đã có — skip")
        return guide_data.get('style_guide', '')

    # Pass 1: Extract observations from all works (500 works/batch)
    PASS1_BATCH = 500
    remaining = all_works[done_batches * PASS1_BATCH:]
    total_batches = (len(all_works) + PASS1_BATCH - 1) // PASS1_BATCH

    print(f"  📖 Pass 1: {len(all_works):,} works → {total_batches} batches")
    print(f"  📌 Resume từ batch {done_batches}")

    for batch_num, batch in enumerate(batched(remaining, PASS1_BATCH)):
        actual_num = done_batches + batch_num
        # Build prompt: first 200 chars of each work
        entries = []
        for w in batch:
            content = (w.get('content') or '').strip()[:200]
            title = w.get('title', '')[:60]
            if content:
                entries.append(f"[{title}]: {content}")
        user_msg = '\n'.join(entries[:200])  # cap at 200 entries

        result = gpt4o_call(client, [
            {'role': 'system', 'content': STYLE_GUIDE_SYSTEM},
            {'role': 'user', 'content': f"Batch {actual_num+1}/{total_batches}:\n\n{user_msg}"},
        ], 'style_guide', max_tokens=1000)

        if result:
            try:
                obs = json.loads(result)
                all_observations.extend(obs.get('observations', []))
            except Exception:
                # Try to extract observations as text
                all_observations.append(result[:500])

        if (batch_num + 1) % 5 == 0:
            save_ckpt({'done_batches': actual_num + 1, 'observations': all_observations}, CKPT_STYLE)
            print(f"  [{(actual_num+1)/total_batches*100:.0f}%] {actual_num+1}/{total_batches} batches | {len(all_observations)} observations")

        time.sleep(DELAY_SEC)

    print(f"\n  📝 Pass 2: Consolidating {len(all_observations)} observations...")

    # Pass 2: Consolidate all observations into a Style Guide
    obs_text = '\n'.join(f"- {o}" for o in all_observations[:500])  # cap at 500

    style_guide_text = gpt4o_call(client, [
        {'role': 'system', 'content': STYLE_CONSOLIDATE_SYSTEM},
        {'role': 'user', 'content': f"Here are the observations:\n\n{obs_text}"},
    ], 'style_consolidate', max_tokens=2000)

    if not style_guide_text:
        style_guide_text = f"NTHL Style observations:\n{obs_text[:1000]}"

    guide_data = {
        'generated_at': datetime.now().isoformat(),
        'style_guide': style_guide_text,
        'raw_observations': all_observations,
    }
    save_json(guide_data, STYLE_GUIDE, "nthl_style_guide.json")

    if CKPT_STYLE.exists():
        CKPT_STYLE.unlink()

    print(f"  ✅ Style guide hoàn thành ({len(style_guide_text)} chars)")
    return style_guide_text


# ── Phase B2: Smart Chunking ──────────────────────────────────────────────────
def smart_chunk_work(work: dict) -> list[dict]:
    """Chunk theo loại bài: thơ ngắn=nguyên bài, thơ dài=theo khổ, stt=nguyên bài."""
    content = (work.get('content') or '').strip()
    if not content:
        return []

    genre = work.get('genre', 'stt')

    # Status/photo/video/unknown: nguyên bài = 1 chunk
    if genre in ('stt', 'photo', 'video', 'ton_nghi'):
        if len(content) > 20:  # skip quá ngắn
            return [content]
        return []

    # Poem hoặc prose
    lines = [l for l in content.split('\n') if l.strip()]

    # Thơ ngắn (≤ 8 dòng): nguyên bài = 1 chunk
    if len(lines) <= 8:
        return [content]

    # Thử cắt theo khổ (paragraph, ngăn cách bởi dòng trống)
    paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
    if len(paragraphs) >= 2:
        # Ghép khổ quá ngắn (<2 dòng) với khổ kế tiếp
        merged = []
        buf = ''
        for p in paragraphs:
            p_lines = [l for l in p.split('\n') if l.strip()]
            if not p_lines:
                continue
            if buf and len(buf.split('\n')) < 2:
                buf = buf + '\n\n' + p
            else:
                if buf:
                    merged.append(buf)
                buf = p
        if buf:
            merged.append(buf)
        if merged:
            return merged

    # Sliding window: 4 dòng, overlap 2
    chunks = []
    step = 4
    overlap = 2
    stride = step - overlap
    for i in range(0, len(lines), stride):
        chunk_lines = lines[i:i+step]
        if len(chunk_lines) >= 2:
            chunks.append('\n'.join(chunk_lines))
    return chunks


def run_smart_chunk(all_works: list) -> list:
    print("\n" + "="*60)
    print("  PHASE B2: SMART CHUNKING")
    print("="*60)

    chunks = []
    works_chunked = 0
    skipped = 0

    for w in all_works:
        # Skip tam_xoa
        if w.get('status') == 'tam_xoa':
            skipped += 1
            continue

        raw_chunks = smart_chunk_work(w)
        works_chunked += 1

        for c in raw_chunks:
            chunks.append({
                'id': str(uuid.uuid4()),
                'workId': w['id'],
                'workTitle': w.get('title', ''),
                'workSlug': w.get('slug', ''),
                'workGenre': w.get('genre', 'stt'),
                'content': c,
                'fullWorkContent': (w.get('content') or '')[:1000],
            })

    save_json(chunks, CHUNKS_CLEAN, "chunks_clean.json")

    # Stats
    genre_chunks = Counter(c['workGenre'] for c in chunks)
    print(f"\n  📊 Works chunked: {works_chunked:,} | Skipped: {skipped:,}")
    print(f"  📊 Total chunks: {len(chunks):,}")
    for g, cnt in genre_chunks.most_common():
        print(f"     {g:<12} {cnt:>6}")
    print(f"\n  ✅ Smart chunking hoàn thành")
    return chunks


# ── Phase B3: GPT-4o Describe ────────────────────────────────────────────────
def build_describe_system(style_guide: str) -> str:
    return f"""You are a Vietnamese literary critic specializing in contemporary Vietnamese poetry.

{NTHL_POETIC_THEORY}

## STYLE GUIDE FOR NGUYỄN THẾ HOÀNG LINH

{style_guide}

## YOUR TASK

For each text fragment, analyze it through the "5 tính thơ" lens.
Consider the FULL WORK context when analyzing a fragment.

Return a JSON array:
[{{
  "id": "chunk_id",
  "description": "1-3 câu phân tích ngắn gọn, súc tích, bằng tiếng Việt. Nêu bật những tính thơ nổi bật nhất.",
  "themes": ["theme1", "theme2"],
  "subjects": ["subject1", "subject2"],  
  "emotional_tone": "hài hước / triết lý / buồn / tự trào / trong sáng / ..."
}}]

Guidelines:
- description: Capture the unique poetic qualities — imagery power, conceptual novelty, rhythm, emotional authenticity, philosophical depth
- themes: 1-4 keywords (e.g., "tình yêu", "trẻ con", "Hà Nội", "cô đơn", "tự trào")
- subjects: concrete subjects in the text (e.g., "mặt trời", "bà nội", "chiếc xe đạp")
- emotional_tone: 1-3 words capturing the emotional character
- For very short pieces (1-2 lines): focus on what makes them work as compressed poetry
- For status posts: note the lack of poetic quality if truly absent"""


def run_describe(client, chunks: list, style_guide: str) -> list:
    print("\n" + "="*60)
    print("  PHASE B3: GPT-4o DESCRIBE (5 tính thơ)")
    print("="*60)

    system_prompt = build_describe_system(style_guide)

    ckpt = load_ckpt(CKPT_DESCRIBE)
    done_ids = set(ckpt.get('done_ids', []))
    existing_describes = ckpt.get('describes', [])

    chunk_map = {c['id']: c.copy() for c in chunks}
    # Merge existing descriptions
    for d in existing_describes:
        if d['id'] in chunk_map:
            chunk_map[d['id']].update(d)

    remaining = [c for c in chunks if c['id'] not in done_ids]
    total = len(chunks)
    processed = len(done_ids)

    print(f"  📌 Checkpoint: {processed:,}/{total:,} done")
    print(f"  🎭 Còn lại: {len(remaining):,} chunks")

    for batch_num, batch in enumerate(batched(remaining, BATCH_SIZE)):
        entries = []
        for c in batch:
            entries.append(
                f'CHUNK_ID: {c["id"]}\n'
                f'WORK TITLE: {c["workTitle"]}\n'
                f'GENRE: {c["workGenre"]}\n'
                f'CHUNK:\n{c["content"]}\n'
                f'FULL WORK (context):\n{c["fullWorkContent"][:600]}'
            )
        user_msg = '\n\n===\n\n'.join(entries)

        results = gpt4o_json(client, [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_msg},
        ], 'describe')

        if results:
            for r in results:
                cid = r.get('id')
                if cid and cid in chunk_map:
                    chunk_map[cid]['description'] = r.get('description', '')
                    chunk_map[cid]['themes'] = r.get('themes', [])
                    chunk_map[cid]['subjects'] = r.get('subjects', [])
                    chunk_map[cid]['emotional_tone'] = r.get('emotional_tone', '')
                    done_ids.add(cid)
        else:
            # Mark as done to avoid retrying forever
            for c in batch:
                done_ids.add(c['id'])
            print(f"    ⚠️  Batch {batch_num+1} failed entirely")

        processed += len(batch)

        if (batch_num + 1) % 10 == 0:
            pct = processed / total * 100
            print(f"  [{pct:5.1f}%] {processed:,}/{total:,}")

        if (batch_num + 1) % 50 == 0:
            described = [c for c in chunk_map.values() if 'description' in c]
            save_ckpt({'done_ids': list(done_ids), 'describes': described}, CKPT_DESCRIBE)

        time.sleep(DELAY_SEC)

    described_chunks = list(chunk_map.values())
    save_json(described_chunks, CHUNKS_DESCRIBED, "chunks_described.json")

    if CKPT_DESCRIBE.exists():
        CKPT_DESCRIBE.unlink()

    with_desc = sum(1 for c in described_chunks if c.get('description'))
    print(f"\n  ✅ Describe hoàn thành: {with_desc:,}/{len(described_chunks):,} có description")
    return described_chunks


# ── Phase B4: Embed ───────────────────────────────────────────────────────────
def build_embed_text(chunk: dict) -> str:
    """Build rich embed text: genre + title + content + description."""
    genre_map = {"poem": "Thơ", "stt": "Status", "photo": "Ảnh", "video": "Video",
                 "prose": "Văn xuôi", "ton_nghi": "Tác phẩm"}
    genre_label = genre_map.get(chunk.get('workGenre', 'stt'), 'Tác phẩm')

    parts = [f"[{genre_label}] {chunk.get('workTitle', '')}"]
    parts.append(chunk.get('content', ''))

    if chunk.get('description'):
        parts.append(f"Phân tích: {chunk['description']}")
    if chunk.get('themes'):
        parts.append(f"Chủ đề: {', '.join(chunk['themes'])}")
    if chunk.get('subjects'):
        parts.append(f"Hình ảnh: {', '.join(chunk['subjects'])}")
    if chunk.get('emotional_tone'):
        parts.append(f"Cảm xúc: {chunk['emotional_tone']}")

    return '\n'.join(parts)


def run_embed(client, chunks: list) -> list:
    print("\n" + "="*60)
    print("  PHASE B4: EMBED (text-embedding-3-large)")
    print("="*60)

    ckpt = load_ckpt(CKPT_EMBED)
    done_ids = set(ckpt.get('done_ids', []))

    chunk_map = {c['id']: c for c in chunks}
    remaining = [c for c in chunks if c['id'] not in done_ids]
    total = len(chunks)

    print(f"  📌 Checkpoint: {len(done_ids):,}/{total:,}")
    print(f"  📐 Còn lại: {len(remaining):,} chunks")

    # Estimate cost
    total_chars = sum(len(build_embed_text(c)) for c in remaining)
    est_tokens = total_chars / 3
    est_cost = est_tokens / 1_000_000 * 0.13
    print(f"  💰 Ước tính: ~{est_tokens:,.0f} tokens → ~${est_cost:.2f}")

    processed = len(done_ids)

    for batch_num, batch in enumerate(batched(remaining, EMBED_BATCH)):
        texts = [build_embed_text(c) for c in batch]
        ids = [c['id'] for c in batch]

        for attempt in range(3):
            try:
                resp = client.embeddings.create(
                    model="text-embedding-3-large",
                    input=texts,
                )
                for cid, emb_data in zip(ids, resp.data):
                    chunk_map[cid]['embedding'] = emb_data.embedding
                    done_ids.add(cid)
                processed += len(ids)
                break
            except Exception as e:
                print(f"    ⚠️  Attempt {attempt+1}/3: {e}")
                if attempt < 2:
                    time.sleep(2 ** attempt * 5)

        if (batch_num + 1) % 20 == 0:
            pct = processed / total * 100
            print(f"  [{pct:5.1f}%] {processed:,}/{total:,}")
            save_ckpt({'done_ids': list(done_ids)}, CKPT_EMBED)

        time.sleep(0.1)

    embedded_chunks = list(chunk_map.values())
    save_json(embedded_chunks, CHUNKS_EMBEDDED, "chunks_with_embeddings.json")

    if CKPT_EMBED.exists():
        CKPT_EMBED.unlink()

    with_emb = sum(1 for c in embedded_chunks if 'embedding' in c)
    print(f"\n  ✅ Embed hoàn thành: {with_emb:,}/{len(embedded_chunks):,} có embedding")
    return embedded_chunks


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='NTHL Smart Embedding Pipeline')
    parser.add_argument('--from-phase', type=int, default=1, help='Bắt đầu từ phase (1-4)')
    args = parser.parse_args()

    print("\n" + "="*60)
    print("  NTHL SMART EMBEDDING PIPELINE")
    print("="*60)

    # Check dependencies
    try:
        from openai import OpenAI
    except ImportError:
        print("⚠️  openai chưa cài. Chạy: pip3 install openai")
        sys.exit(1)

    api_key = load_env_key("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY không tìm thấy")
        sys.exit(1)

    client = OpenAI(api_key=api_key)

    # Load clean works
    print("\n📂 Đọc dữ liệu sạch...")
    works = []
    if WORKS_CLEAN.exists():
        works += load_json(WORKS_CLEAN)
    else:
        print(f"  ⚠️  {WORKS_CLEAN.name} chưa có — chạy clean-data.py trước")
        sys.exit(1)

    if FORUM_CLEAN.exists():
        works += load_json(FORUM_CLEAN)

    # Filter active works
    active_works = [w for w in works if w.get('status') != 'tam_xoa']
    print(f"  Active works: {len(active_works):,}/{len(works):,}")

    from_phase = args.from_phase

    # Phase B1: Style Guide
    style_guide = ''
    if from_phase <= 1:
        style_guide = run_style_guide(client, active_works)
    else:
        if STYLE_GUIDE.exists():
            guide_data = json.load(open(STYLE_GUIDE))
            style_guide = guide_data.get('style_guide', '')
            print(f"\n  📋 Style guide loaded ({len(style_guide)} chars)")
        else:
            print("  ⚠️  nthl_style_guide.json không tìm thấy — chạy từ phase 1")
            sys.exit(1)

    # Phase B2: Smart Chunk
    if from_phase <= 2:
        chunks = run_smart_chunk(active_works)
    else:
        chunks = load_json(CHUNKS_CLEAN)

    # Phase B3: Describe
    if from_phase <= 3:
        chunks = run_describe(client, chunks, style_guide)
    else:
        chunks = load_json(CHUNKS_DESCRIBED)

    # Phase B4: Embed
    if from_phase <= 4:
        chunks = run_embed(client, chunks)

    print("\n" + "="*60)
    print("  ✅ EMBED PIPELINE HOÀN THÀNH!")
    print("="*60)
    print(f"""
  Output files:
    ✨ output/data/nthl_style_guide.json         ← NTHL Style Guide
    ✨ output/data/chunks_clean.json             ← Smart chunks
    ✨ output/data/chunks_described.json         ← Chunks + 5 tính thơ analysis
    ✨ output/data/chunks_with_embeddings.json   ← Final embeddings

  Bước tiếp theo:
    python3 scripts/seed_db.py  ← Seed vào PostgreSQL
""")


if __name__ == '__main__':
    main()
