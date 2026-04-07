#!/usr/bin/env python3
"""
chunk-and-embed-forums.py — Phase 5: Chunk + Embeddings
=========================================================
Đọc forum_works_new.json → chunk → embed → lưu forum_chunks_with_embeddings.json
"""

import json, os, sys, uuid, re, time
from pathlib import Path

try:
    import openai
except ImportError:
    os.system(f"{sys.executable} -m pip install --break-system-packages openai -q")
    import openai

BASE_DIR   = Path(__file__).parent.parent.parent
DATA_DIR   = BASE_DIR / "output" / "data"
WORKS_FILE = DATA_DIR / "forum_works_new.json"
CHUNKS_FILE = DATA_DIR / "forum_chunks_with_embeddings.json"
CKPT_FILE  = DATA_DIR / "embed_forum_checkpoint.json"

EMBED_MODEL    = "text-embedding-3-large"
BATCH_SIZE     = 100
MAX_CHUNK_LEN  = 800
MIN_CHUNK_LEN  = 8
CHECKPOINT_EVERY = 500


def load_api_key():
    env = BASE_DIR / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("OPENAI_API_KEY")


def chunk_work(work):
    """Chia nội dung thành chunks 1-2 dòng (giống build-data.py)."""
    text = work.get('content', '')
    if not text:
        return []
    genre = work.get('genre', '')
    if genre in ('video', 'photo'):
        return []  # không chunk media

    chunks = []
    lines = text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if len(line) < MIN_CHUNK_LEN:
            i += 1
            continue
        # Long line → split by sentence
        if len(line) > 120:
            for s in re.split(r'(?<=[.!?])\s+', line):
                s = s.strip()
                if len(s) >= MIN_CHUNK_LEN:
                    chunks.append(s)
            i += 1
            continue
        # Merge 2 short lines
        if len(line) < 60 and i + 1 < len(lines):
            next_line = lines[i+1].strip()
            if MIN_CHUNK_LEN <= len(next_line) < 60:
                chunks.append(f"{line}\n{next_line}")
                i += 2
                continue
        chunks.append(line)
        i += 1
    return chunks


def main():
    print("=" * 60)
    print("  Phase 5: Chunk + Embeddings")
    print("=" * 60)
    print()

    # Dùng forum_works_new.json (sau dedup) nếu có, không thì dùng forum_works.json
    works_file = WORKS_FILE if WORKS_FILE.exists() else DATA_DIR / "forum_works.json"
    print(f"  Loading: {works_file.name}")
    works = json.loads(works_file.read_text(encoding='utf-8'))
    print(f"  Works to chunk: {len(works)}")

    # Build all chunks
    all_chunks = []
    for w in works:
        raw_chunks = chunk_work(w)
        for c in raw_chunks:
            all_chunks.append({
                'id': str(uuid.uuid4()),
                'workId': w['id'],
                'workSlug': w.get('slug', ''),
                'content': c[:2000],
                'score': 0,
                'isBlocked': False,
                'embedding': None,
            })

    print(f"  Tổng chunks: {len(all_chunks)}")

    # Load checkpoint
    start_idx = 0
    if CKPT_FILE.exists():
        ckpt = json.loads(CKPT_FILE.read_text())
        start_idx = ckpt.get('done', 0)
        if CHUNKS_FILE.exists():
            saved = json.loads(CHUNKS_FILE.read_text(encoding='utf-8'))
            # Merge embeddings back
            saved_map = {c['id']: c.get('embedding') for c in saved}
            for c in all_chunks:
                if c['id'] in saved_map:
                    c['embedding'] = saved_map[c['id']]
        print(f"  🔄 Resume từ chunk #{start_idx}")

    remaining = [i for i, c in enumerate(all_chunks) if c['embedding'] is None]
    print(f"  Còn lại cần embed: {len(remaining)}\n")

    if not remaining:
        print("  ✅ Tất cả đã có embedding!")
        CHUNKS_FILE.write_text(json.dumps(all_chunks, ensure_ascii=False), encoding='utf-8')
        return

    # Load API
    api_key = load_api_key()
    if not api_key:
        print("  ❌ Không tìm thấy OPENAI_API_KEY!")
        sys.exit(1)
    client = openai.OpenAI(api_key=api_key)

    # Estimate cost
    total_chars = sum(len(all_chunks[i]['content']) for i in remaining)
    est_tokens = total_chars / 3
    est_cost = est_tokens / 1_000_000 * 0.13
    print(f"  Ước tính: {est_tokens:,.0f} tokens → ~${est_cost:.3f}")
    print()

    processed = 0
    errors = 0
    start_time = time.time()

    for batch_start in range(0, len(remaining), BATCH_SIZE):
        batch_indices = remaining[batch_start:batch_start + BATCH_SIZE]
        texts = [all_chunks[i]['content'] for i in batch_indices]

        for retry in range(5):
            try:
                resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
                for idx, emb_data in zip(batch_indices, resp.data):
                    all_chunks[idx]['embedding'] = emb_data.embedding
                processed += len(batch_indices)
                break
            except openai.RateLimitError:
                wait = (retry + 1) * 15
                print(f"    ⏳ Rate limit, chờ {wait}s...")
                time.sleep(wait)
            except Exception as e:
                if retry < 4:
                    print(f"    ⚠️ Error retry {retry+1}: {e}")
                    time.sleep(5)
                else:
                    print(f"    ❌ Failed: {e}")
                    errors += len(batch_indices)

        # Progress
        elapsed = time.time() - start_time
        rate = processed / elapsed if elapsed > 0 else 1
        eta = (len(remaining) - processed) / rate / 60 if rate > 0 else 0
        pct = processed / len(remaining) * 100
        if batch_start % (BATCH_SIZE * 10) == 0 or processed == len(remaining):
            print(f"  [{pct:5.1f}%] {processed:,}/{len(remaining):,} | {rate:.0f}/s | ETA {eta:.1f}m")

        # Checkpoint
        if processed % CHECKPOINT_EVERY == 0:
            CHUNKS_FILE.write_text(json.dumps(all_chunks, ensure_ascii=False), encoding='utf-8')
            CKPT_FILE.write_text(json.dumps({'done': processed}))
            print(f"    💾 checkpoint @ {processed}")

        time.sleep(0.1)

    # Final save
    CHUNKS_FILE.write_text(json.dumps(all_chunks, ensure_ascii=False), encoding='utf-8')
    if CKPT_FILE.exists():
        CKPT_FILE.unlink()

    with_emb = sum(1 for c in all_chunks if c['embedding'])
    print()
    print("=" * 60)
    print("  ✅ Phase 5 hoàn thành!")
    print(f"     Chunks: {len(all_chunks)}")
    print(f"     With embedding: {with_emb}")
    print(f"     Errors: {errors}")
    print(f"     Output: {CHUNKS_FILE.relative_to(BASE_DIR)}")
    print("=" * 60)


if __name__ == '__main__':
    main()
