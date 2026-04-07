#!/usr/bin/env python3
"""
classify-genres.py — Phase 3: Phân loại genre bằng AI
=======================================================
- Nguồn tienve: dùng genreHint nếu có
- Nguồn ttvnol/gioo: gọi GPT-4o-mini để phân loại

Genres hợp lệ: poem, stt, essay, short_story, memoir, children
Output: cập nhật output/data/forum_works.json
"""

import json, os, sys, time
from pathlib import Path

try:
    import openai
except ImportError:
    os.system(f"{sys.executable} -m pip install --break-system-packages openai -q")
    import openai

BASE_DIR = Path(__file__).parent.parent.parent
DATA_DIR  = BASE_DIR / "output" / "data"
WORKS_FILE = DATA_DIR / "forum_works.json"
CKPT_FILE  = DATA_DIR / "classify_checkpoint.json"

VALID_GENRES = {'poem', 'stt', 'essay', 'short_story', 'memoir', 'children'}
BATCH_SIZE = 20
CHECKPOINT_EVERY = 50

PROMPT_SYSTEM = """Bạn là chuyên gia phân loại thể loại văn học Việt Nam.
Phân loại văn bản vào MỘT thể loại:
- poem: Thơ (có vần điệu hoặc dòng ngắn theo nhịp, trữ tình)
- essay: Tản văn / Tuỳ bút (văn xuôi nghệ thuật, suy tư, không có cốt truyện rõ)
- short_story: Truyện ngắn (có cốt truyện, nhân vật, sự kiện)
- memoir: Bút ký (ghi chép trải nghiệm cá nhân, hồi ký)
- stt: Status / Ghi chú (đoạn ngắn, nhật ký, suy nghĩ tự do < 300 ký tự hoặc không rõ thể loại)
- children: Thơ / văn thiếu nhi

Chỉ trả lời tên thể loại, không giải thích."""


def load_api_key():
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("OPENAI_API_KEY")


def classify_batch(client, works_batch):
    """
    Gọi GPT-4o-mini để classify 1 batch.
    Returns list of genres (same order as input).
    """
    results = []
    for w in works_batch:
        content_preview = w['content'][:800]
        try:
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": PROMPT_SYSTEM},
                    {"role": "user", "content": f"Văn bản:\n{content_preview}"}
                ],
                max_tokens=10,
                temperature=0,
            )
            genre = resp.choices[0].message.content.strip().lower()
            # Validate
            if genre not in VALID_GENRES:
                # Try to extract from response
                for g in VALID_GENRES:
                    if g in genre:
                        genre = g
                        break
                else:
                    genre = 'stt'  # default fallback
            results.append(genre)
        except Exception as e:
            print(f"    ⚠️ API error: {e}")
            results.append('stt')
        time.sleep(0.3)  # Avoid rate limit
    return results


def main():
    print("=" * 60)
    print("  Phase 3: Genre Classification")
    print("=" * 60)
    print()

    # Load works
    works = json.loads(WORKS_FILE.read_text(encoding='utf-8'))
    needs_classify = [i for i, w in enumerate(works) if w.get('needsGenreClassification')]
    already_done = len(works) - len(needs_classify)
    print(f"  Tổng works: {len(works)}")
    print(f"  Đã có genre: {already_done}")
    print(f"  Cần classify: {len(needs_classify)}")

    if not needs_classify:
        print("  ✅ Tất cả đã có genre!")
        return

    # Load checkpoint
    start_idx = 0
    if CKPT_FILE.exists():
        ckpt = json.loads(CKPT_FILE.read_text())
        start_idx = ckpt.get('done', 0)
        print(f"  🔄 Resume từ #{start_idx}")

    api_key = load_api_key()
    if not api_key:
        print("  ❌ Không tìm thấy OPENAI_API_KEY trong .env!")
        sys.exit(1)
    client = openai.OpenAI(api_key=api_key)
    print("  ✅ OpenAI API key loaded\n")

    todo = needs_classify[start_idx:]
    total = len(todo)
    processed = start_idx

    for batch_start in range(0, total, BATCH_SIZE):
        batch_indices = todo[batch_start:batch_start + BATCH_SIZE]
        batch_works = [works[i] for i in batch_indices]

        genres = classify_batch(client, batch_works)

        for i, genre in zip(batch_indices, genres):
            works[i]['genre'] = genre
            works[i]['needsGenreClassification'] = False
            works[i]['autoClassified'] = True

        processed += len(batch_indices)
        pct = processed / len(needs_classify) * 100
        print(f"  [{pct:5.1f}%] {processed}/{len(needs_classify)} classified")

        # Checkpoint
        if processed % CHECKPOINT_EVERY == 0:
            WORKS_FILE.write_text(json.dumps(works, ensure_ascii=False, indent=2), encoding='utf-8')
            CKPT_FILE.write_text(json.dumps({'done': processed}))
            print(f"    💾 checkpoint @ {processed}")

    # Final save
    WORKS_FILE.write_text(json.dumps(works, ensure_ascii=False, indent=2), encoding='utf-8')
    if CKPT_FILE.exists():
        CKPT_FILE.unlink()

    # Stats
    genre_counts = {}
    for w in works:
        genre_counts[w['genre']] = genre_counts.get(w['genre'], 0) + 1

    print()
    print("=" * 60)
    print("  ✅ Phase 3 hoàn thành!")
    print(f"     Tổng classified: {processed}")
    print(f"     Phân bổ genre:")
    for g, c in sorted(genre_counts.items(), key=lambda x: -x[1]):
        print(f"       {g}: {c}")
    print("=" * 60)


if __name__ == '__main__':
    main()
