#!/usr/bin/env python3
"""
generate_embeddings.py — Tạo vector embeddings cho chunks
============================================================
Sử dụng OpenAI text-embedding-3-large để biến 133K chunks thành vectors.
Lưu kết quả vào chunks_with_embeddings.json (dùng cho seed_db).

Chi phí ước tính: ~$1.60 cho 133K chunks.

Cách chạy:
  python3 scripts/generate_embeddings.py
"""

import json, os, time, sys
from pathlib import Path

# Cài openai nếu chưa có
try:
    import openai
except ImportError:
    print("⚠️  Đang cài openai...")
    os.system(f"{sys.executable} -m pip install openai -q")
    import openai

# ── Config ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "output" / "data"
CHUNKS_FILE = DATA_DIR / "chunks.json"
OUTPUT_FILE = DATA_DIR / "chunks_with_embeddings.json"
CHECKPOINT_FILE = DATA_DIR / "embedding_checkpoint.json"

MODEL = "text-embedding-3-large"  # 3072 dimensions, best quality
BATCH_SIZE = 100                   # OpenAI max = 2048, nhưng 100 an toàn
MAX_RETRIES = 5
CHECKPOINT_INTERVAL = 500          # Save progress mỗi 500 batches

# ── Load API key ──────────────────────────────────────────────────────────────
def load_api_key():
    # Try .env file
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                if line.startswith("OPENAI_API_KEY="):
                    return line.strip().split("=", 1)[1].strip('"').strip("'")
    # Try environment
    key = os.environ.get("OPENAI_API_KEY")
    if key:
        return key
    print("❌ Không tìm thấy OPENAI_API_KEY trong .env hoặc environment!")
    sys.exit(1)

# ── Batch helper ──────────────────────────────────────────────────────────────
def batched(items, n):
    for i in range(0, len(items), n):
        yield items[i:i+n]

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  Generate Embeddings — text-embedding-3-large")
    print("=" * 60)
    print()

    # Load API key
    api_key = load_api_key()
    client = openai.OpenAI(api_key=api_key)
    print("✅ OpenAI API key loaded\n")

    # Load chunks
    print(f"📂 Đọc {CHUNKS_FILE.name}...")
    with open(CHUNKS_FILE, 'r', encoding='utf-8') as f:
        chunks = json.load(f)
    print(f"   Tổng chunks: {len(chunks):,}\n")

    # Load checkpoint nếu có (resume từ lần trước bị gián đoạn)
    start_idx = 0
    if CHECKPOINT_FILE.exists():
        with open(CHECKPOINT_FILE, 'r') as f:
            checkpoint = json.load(f)
        start_idx = checkpoint.get('last_processed', 0)
        if start_idx > 0:
            print(f"🔄 Resume từ checkpoint: {start_idx:,}/{len(chunks):,}")
            # Load partial results
            if OUTPUT_FILE.exists():
                with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                    chunks = json.load(f)
                print(f"   Loaded {sum(1 for c in chunks if 'embedding' in c):,} embeddings đã có\n")

    # Count remaining
    remaining = [i for i, c in enumerate(chunks) if 'embedding' not in c]
    if not remaining:
        print("✅ Tất cả chunks đã có embedding!")
        return

    print(f"🚀 Cần tạo embedding cho {len(remaining):,} chunks")
    total_batches = (len(remaining) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"   Batches: {total_batches} × {BATCH_SIZE}")

    # Estimate cost
    total_chars = sum(len(chunks[i]['content']) for i in remaining)
    est_tokens = total_chars / 3  # rough estimate
    est_cost = est_tokens / 1_000_000 * 0.13  # $0.13/1M tokens for large
    print(f"   Ước tính: ~{est_tokens:,.0f} tokens → ~${est_cost:.2f}")
    print()

    # Process batches
    processed = 0
    errors = 0
    start_time = time.time()

    for batch_num, batch_indices in enumerate(batched(remaining, BATCH_SIZE)):
        texts = [chunks[i]['content'] for i in batch_indices]

        # Retry logic
        for retry in range(MAX_RETRIES):
            try:
                response = client.embeddings.create(
                    model=MODEL,
                    input=texts
                )
                # Save embeddings
                for idx, emb_data in zip(batch_indices, response.data):
                    chunks[idx]['embedding'] = emb_data.embedding

                processed += len(batch_indices)
                break

            except openai.RateLimitError:
                wait = (retry + 1) * 10
                print(f"   ⏳ Rate limit, chờ {wait}s...")
                time.sleep(wait)

            except openai.APIError as e:
                if retry < MAX_RETRIES - 1:
                    print(f"   ⚠️ API error: {e}, retry {retry+1}...")
                    time.sleep(5)
                else:
                    print(f"   ❌ Lỗi sau {MAX_RETRIES} lần: {e}")
                    errors += len(batch_indices)

        # Progress
        elapsed = time.time() - start_time
        rate = processed / elapsed if elapsed > 0 else 0
        eta = (len(remaining) - processed) / rate if rate > 0 else 0
        pct = processed / len(remaining) * 100

        if (batch_num + 1) % 10 == 0 or batch_num == total_batches - 1:
            print(f"   [{pct:5.1f}%] {processed:,}/{len(remaining):,} | "
                  f"{rate:.0f} chunks/s | ETA: {eta/60:.1f}m")

        # Checkpoint
        if (batch_num + 1) % CHECKPOINT_INTERVAL == 0:
            print(f"   💾 Saving checkpoint...")
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(chunks, f, ensure_ascii=False)
            with open(CHECKPOINT_FILE, 'w') as f:
                json.dump({'last_processed': processed}, f)

        # Slight delay to avoid rate limits
        time.sleep(0.1)

    # ── Final save ──
    print(f"\n💾 Lưu {OUTPUT_FILE.name}...")
    
    # Save version without embeddings (lighter, for reference)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(chunks, f, ensure_ascii=False)
    
    # Verify
    with_emb = sum(1 for c in chunks if 'embedding' in c)
    without_emb = sum(1 for c in chunks if 'embedding' not in c)

    elapsed = time.time() - start_time
    print()
    print("=" * 60)
    print(f"  ✅ HOÀN THÀNH!")
    print(f"     Processed: {processed:,} chunks")
    print(f"     With embedding: {with_emb:,}")
    print(f"     Without (errors): {without_emb:,}")
    print(f"     Errors: {errors}")
    print(f"     Thời gian: {elapsed/60:.1f} phút")
    print(f"     Output: {OUTPUT_FILE.relative_to(BASE_DIR)}")
    print("=" * 60)

    # Clean up checkpoint
    if CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()

if __name__ == '__main__':
    main()
