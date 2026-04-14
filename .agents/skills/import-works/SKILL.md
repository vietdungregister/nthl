---
name: import-works
description: |
  Import tác phẩm mới từ file JSON (Facebook export hoặc JSON thủ công) vào database NTHL.
  Bao gồm: parse → clean (regex + AI genre) → dedup → chunk → embed → seed DB →
  update search index → deploy production.
  Đã tối ưu: 11-step regex cleanup, GPT-4o genre classify, hash-based dedup O(1),
  progressive phrase search (phraseto_tsquery), composite score ranking,
  RAG-enriched embeddings (5 tính thơ + NTHL Style Guide).
---

# Import Works từ JSON — NTHL Literary Archive

## Mục tiêu cốt lõi

Nhận file JSON tác phẩm mới (từ Facebook export hoặc do tác giả cung cấp) → import vào
hệ thống NTHL với **chất lượng production-ready**: dữ liệu sạch, phân loại thể loại đúng,
không trùng lặp, search hoạt động ngay lập tức (bao gồm cả keyword và AI semantic search).

## Khi nào dùng

- Tác giả gửi thêm file Facebook export JSON mới
- Cần import batch tác phẩm từ file JSON bất kỳ
- Cần re-import/re-clean toàn bộ dữ liệu

## ⚠️ Bẫy (Pitfalls) đã rút kinh nghiệm

> **CRITICAL — Mỗi mục dưới đây là lỗi thực tế đã xảy ra.**

### 1. Encoding Facebook JSON
Facebook export dùng `\u00c3\u00a1` thay vì `á` (double-encoded UTF-8).
Script `build-data.py` đã xử lý tự động. Nếu parse file mới, PHẢI kiểm tra encoding.
```python
# Test nhanh:
text = json.loads(data.encode('latin1').decode('utf-8'))
```

### 2. Genre "prose" đã deprecated
Database đã migrate `prose` → `stt`. Genres hợp lệ hiện tại:
`poem`, `stt`, `essay`, `short_story`, `memoir`, `children`, `photo`, `video`, `ton_nghi`

### 3. Embedding model PHẢI là text-embedding-3-large
Database lưu vectors 3072 dimensions. Nếu dùng model khác (small = 1536d), cosine search
sẽ lỗi dimension mismatch. **KHÔNG ĐƯỢC ĐỔI MODEL** trừ khi re-embed toàn bộ.

### 4. searchVector PHẢI được populate
Bài mới insert mà KHÔNG có `searchVector` sẽ **vô hình** trong keyword search.
Script `seed_db.py` tự populate. Nếu insert qua cách khác, PHẢI chạy:
```sql
UPDATE "Work" SET "searchVector" = to_tsvector('simple',
  COALESCE(title,'') || ' ' || COALESCE(excerpt,'') || ' ' || COALESCE(content,''))
WHERE "searchVector" IS NULL;
```

### 5. Slug PHẢI unique + stable
`ON CONFLICT (slug) DO NOTHING` → bài trùng slug sẽ bị skip. Slug sinh từ Vietnamese NFD
→ ASCII → kebab-case. Nếu đổi thuật toán slug, bài cũ sẽ bị duplicate.

### 6. Clean-data pipeline PHẢI backup trước
Pipeline `clean-data.py` sửa trực tiếp file JSON. Nó tự tạo backup trong `output/data/backup/`,
nhưng LUÔN verify backup tồn tại trước khi chạy phase sửa đổi.

### 7. pg_restore mất 1-2 giờ trên VPS 2GB RAM
Dump 1.6GB+ mất rất lâu để restore. Dùng `nohup` trên server để tránh SSH timeout.

### 8. Chunk strategy cho thơ Việt
Chunk 1-2 dòng ngắn, merge dòng < 20 chars, split dòng > 500 chars.
Thơ ngắn (< 3 dòng) → toàn bài là 1 chunk. Quan trọng cho AI semantic search.

### 9. Import tác phẩm mới KHÔNG cần re-embed dữ liệu cũ

Tất cả scripts đều **incremental** — chỉ xử lý bài/chunk mới, skip bài đã có:

| Script | Cơ chế skip |
|---|---|
| `seed_db.py` | `ON CONFLICT (slug) DO NOTHING` → skip slug đã tồn tại |
| `embed-pipeline.py` Phase 3 (describe) | Checkpoint `done_ids` → skip chunk đã describe |
| `embed-pipeline.py` Phase 4 (embed) | Checkpoint → skip chunk đã có embedding |
| `generate_embeddings.py` | Checkpoint → skip chunk đã embed |

→ Import 50 bài mới: chỉ 50 bài đó được describe + embed. 133K bài cũ **không bị đụng**.
→ Chi phí incremental: ~$0.20 (describe) + ~$0.05 (embed) thay vì ~$46 full pipeline.

## Kiến trúc Pipeline (9 Phases)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Phase 1    │     │   Phase 2    │     │   Phase 3    │     │   Phase 4    │
│  PARSE JSON  │────▶│ REGEX CLEAN  │────▶│  AI GENRE    │────▶│   DEDUP +    │
│              │     │  (11 steps)  │     │ CLASSIFY     │     │  STRUCTURAL  │
└──────────────┘     └──────────────┘     │  (GPT-4o)    │     └──────────────┘
                                          └──────────────┘            │
                                                                      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Phase 9    │     │   Phase 8    │     │   Phase 7    │     │   Phase 5    │
│   DEPLOY     │◀────│   SEED DB    │◀────│  EMBED +     │◀────│  SMART CHUNK │
│  PRODUCTION  │     │              │     │  DESCRIBE    │     │              │
└──────────────┘     └──────────────┘     │  (5 tính thơ)│     └──────────────┘
                                          └──────────────┘
                                                ▲
                                          ┌──────────────┐
                                          │   Phase 6    │
                                          │ STYLE GUIDE  │
                                          │  (Two-pass)  │
                                          └──────────────┘
```

## Điều kiện tiên quyết

### Local (Mac)
- Python 3.9+ với: `openai`, `psycopg2-binary`
- Docker Desktop chạy (container `vibe-db` với PostgreSQL + pgvector)
- `OPENAI_API_KEY` trong `.env`
- `DATABASE_URL` trong `.env` (format: `postgresql://vibe_user:...@localhost:5433/vibe_db`)

### Server (Production)
- SSH access tới `188.166.177.93`
- Container `vibe-db` (pgvector/pg16) + `vibe-app` (Next.js) đang chạy
- Disk trống ≥ 3GB

## Variables cheat sheet

| Variable | Giá trị hiện tại | Mô tả |
|---|---|---|
| `PROJECT_DIR` | `/Users/duongvietdung/Documents/Projects/baitapcuoikhoa` | Root project |
| `FB_DIR` | `facebook-nguyenthehoanglinh-06_03_2026-y1cYzpJi/` | Facebook export dir |
| `EMBED_MODEL` | `text-embedding-3-large` | Model embedding (3072d) |
| `CLASSIFY_MODEL` | `gpt-4o-mini` | Model phân loại genre |
| `SERVER_IP` | `188.166.177.93` | Production server |
| `DOCKER_IMAGE` | `vietdungregister/nthl:latest` | Docker Hub image |

## Cấu trúc thư mục

```
baitapcuoikhoa/
├── facebook-nguyenthehoanglinh-06_03_2026-y1cYzpJi/
│   └── your_facebook_activity/posts/
│       ├── your_posts__check_ins__photos_and_videos_1.json   ← hiện tại
│       └── your_posts__check_ins__photos_and_videos_N.json   ← thêm file mới
├── output/data/
│   ├── works.json                   ← output Phase 1
│   ├── chunks.json                  ← output Phase 5
│   ├── chunks_with_embeddings.json  ← output Phase 6
│   ├── works_clean.json             ← output Phase 4 (sau clean)
│   ├── forum_works_clean.json       ← forum works đã clean
│   ├── chunks_clean.json            ← chunks đã clean
│   └── backup/                      ← auto-backup trước mỗi phase sửa đổi
├── scripts/
│   ├── build-data.py                ← Phase 1: Parse Facebook JSON
│   ├── clean-data.py                ← Phase 2-4: Clean + Classify + Structural
│   ├── generate_embeddings.py       ← Phase 6: Tạo embeddings
│   ├── seed_db.py                   ← Phase 7: Import vào PostgreSQL
│   └── apply-clean-to-db.py         ← Patch clean data lên DB có sẵn
└── .env                             ← OPENAI_API_KEY, DATABASE_URL
```

---

## Quy trình thực thi chi tiết

---

### Phase 1 — Parse Facebook JSON (~30 giây)

**Khi nào**: Tác giả gửi file Facebook export mới.

```bash
cd /Users/duongvietdung/Documents/Projects/baitapcuoikhoa

# 1. Đặt file JSON mới vào thư mục posts
# Tên file: your_posts__check_ins__photos_and_videos_N.json (N = số thứ tự tiếp)

# 2. Chạy parse
python3 scripts/build-data.py
```

- Đọc TẤT CẢ file JSON trong thư mục posts
- Fix Facebook double-encoding UTF-8
- Dedup theo timestamp + title
- Lọc "shared a memory", "updated profile", "shared a reel"
- Phân loại sơ bộ: photo/video/poem/stt (rule-based)
- Output: `output/data/works.json` + `output/data/chunks.json`

**Kết quả tham khảo:**
- ~25,538 works
- ~133,000 chunks

---

### Phase 2 — Regex Clean (~10 giây)

```bash
python3 scripts/clean-data.py --from-phase 2 --to-phase 2
```

Hoặc chạy toàn bộ pipeline (Phase 2-8):
```bash
python3 scripts/clean-data.py
```

**11-step regex cleanup** (KHÔNG thay đổi nội dung, chỉ fix format):

| Step | Mô tả | Ví dụ |
|------|--------|-------|
| 1 | Normalize Unicode NFKC | ﬁ → fi |
| 2 | Fix HTML entities | `&amp;` → `&` |
| 3 | Normalize line endings | `\r\n` → `\n` |
| 4 | Remove zero-width chars | `\u200b`, `\ufeff` |
| 5 | Fix multiple spaces | `a   b` → `a b` |
| 6 | Fix leading/trailing whitespace per line | `  hello  ` → `hello` |
| 7 | Collapse blank lines (max 2) | 5 blank → 2 blank |
| 8 | Remove trailing whitespace | `text   \n` → `text\n` |
| 9 | Fix quotation marks | `''` → `'` |
| 10 | Normalize ellipsis | `......` → `...` |
| 11 | Strip BOM | Remove `\ufeff` at start |

---

### Phase 3 — AI Genre Classification (~1-2 giờ, ~$0.30)

```bash
python3 scripts/clean-data.py --from-phase 3 --to-phase 3
```

- Dùng **GPT-4o** phân loại mỗi bài thành 1 genre
- Checkpoint mỗi 200 bài → resume nếu bị ngắt
- Rate limit: sleep 100ms giữa batches

**Genres hợp lệ:**

| Genre | Mô tả | Đặc điểm nhận dạng |
|---|---|---|
| `poem` | Thơ | Vần điệu, dòng ngắn, trữ tình |
| `stt` | Status / Ghi chú | Đoạn ngắn, suy nghĩ tự do, bình luận |
| `essay` | Tản văn / Tuỳ bút | Văn xuôi suy tư, nhiều đoạn |
| `short_story` | Truyện ngắn | Có cốt truyện, nhân vật, lời thoại |
| `memoir` | Bút ký | Ghi chép trải nghiệm cá nhân |
| `photo` | Ảnh | Bài đính kèm ảnh (tự detect) |
| `video` | Video | Bài đính kèm video (tự detect) |
| `ton_nghi` | Tồn nghi | Cần tác giả review (AI không chắc chắn) |

**System prompt cho AI classify:**
```
Bạn là chuyên gia phân loại thể loại văn học Việt Nam. Phân loại văn bản vào MỘT thể loại:
- poem: Thơ (có vần điệu hoặc dòng ngắn theo nhịp, trữ tình)
- essay: Tản văn / Tuỳ bút (văn xuôi suy tư, phi hư cấu)
- short_story: Truyện ngắn (có cốt truyện, nhân vật)
- memoir: Bút ký (ghi chép trải nghiệm cá nhân)
- stt: Status / Ghi chú (đoạn ngắn, suy nghĩ tự do, bình luận)
Chỉ trả lời tên thể loại, không giải thích.
```

**Kết quả tham khảo (~25K bài):**
| Genre | Số lượng |
|---|---|
| poem | ~11,056 |
| stt | ~5,443 |
| ton_nghi | ~4,321 |
| photo | ~3,056 |
| video | ~1,496 |
| prose | ~109 |
| essay | ~34 |

---

### Phase 4 — Structural Cleanup + Dedup (~5 giây)

```bash
python3 scripts/clean-data.py --from-phase 4
```

- Soft-delete bài content rỗng (FB activity: shared/updated/reel)
- Dedup theo normalized title
- Fix excerpts (tạo excert từ 200 chars đầu content)
- Export: `works_clean.json`, `forum_works_clean.json`, `chunks_clean.json`

---

### Phase 5 — Smart Chunking (~10 giây)

```bash
python3 scripts/embed-pipeline.py --from-phase 2 --to-phase 2
```

Hoặc qua clean-data.py (Phase 4 tự tạo `chunks_clean.json`).

**Smart chunking strategy (khác với basic chunking):**

| Loại bài | Cách chunk |
|---|---|
| Thơ ngắn (≤ 8 dòng) | Nguyên bài = 1 chunk |
| Thơ dài (> 8 dòng) | Theo khổ thơ (paragraph), merge khổ ngắn |
| Thơ rất dài | Sliding window 4 dòng, overlap 2 |
| Status/photo/video | Nguyên bài = 1 chunk |
| Content < 20 chars | Skip |

---

### Phase 6 — NTHL Style Guide (Two-pass, ~$5)

> **Chỉ chạy 1 lần duy nhất** (hoặc khi thêm rất nhiều bài mới).
> Output được cache trong `output/data/nthl_style_guide.json`.

```bash
python3 scripts/embed-pipeline.py --from-phase 1 --to-phase 1
```

**Cách hoạt động:**
- **Pass 1**: GPT-4o đọc TOÀN BỘ tác phẩm (batch 500), extract observations về phong cách
- **Pass 2**: GPT-4o consolidate observations → Style Guide (~800 từ)

Style Guide bao gồm: phong cách, chủ đề, cấu trúc, giọng điệu, hình ảnh, kỹ thuật đặc trưng.

---

### Phase 7 — AI Describe + Embed (~4-6 giờ, ~$40 describe + ~$1 embed)

```bash
python3 scripts/embed-pipeline.py --from-phase 3
```

**Đây là phase quan trọng nhất cho AI semantic search.** Pipeline:

**a) GPT-4o Describe theo "5 tính thơ" (~$40)**

Mỗi chunk được GPT-4o phân tích qua lens **"5 tính thơ" của NTHL**:

```
┌────────────────────────────────────────────────────────────┐
│                NTHL'S POETIC THEORY                        │
│                "5 Tính Thơ" — 5 Poetic Qualities           │
│                                                            │
│  1. Hình ảnh (Imagery)        — nội lực hình ảnh           │
│  2. Ý tưởng (Idea/Concept)    — đột phá sáng tạo          │
│  3. Nhạc tính (Musicality)    — nhịp điệu, âm thanh       │
│  4. Mạch cảm xúc (Emotion)    — dòng cảm xúc chân thật   │
│  5. Tư tưởng (Philosophy)     — chiều sâu triết lý        │
│                                                            │
│  "Càng hòa quyện → cấp độ tính thơ càng cao"              │
└────────────────────────────────────────────────────────────┘
```

Output cho mỗi chunk:
```json
{
  "id": "chunk-id",
  "description": "Phân tích 1-3 câu qua lens 5 tính thơ",
  "themes": ["tình yêu", "cô đơn"],
  "subjects": ["mặt trời", "bà nội"],
  "emotional_tone": "tự trào"
}
```

**b) Embed với RAG-enriched text (~$1)**

Embed text = `[Genre] Title + Content + Phân tích + Chủ đề + Hình ảnh + Cảm xúc`

Điều này giúp AI search hiểu **ngữ nghĩa sâu** thay vì chỉ so text thô:
- Query "bài thơ buồn về Hà Nội" → match cả bài không có từ "buồn" nhưng có emotional_tone "u buồn" + subject "Hà Nội cũ"
- Query "thơ hài hước" → match bài có emotional_tone "tự trào / hài hước"

---

### Phase 8 — Seed DB (~5-10 phút)

```bash
python3 scripts/seed_db.py
```

- Insert works: batch 500, `ON CONFLICT (slug) DO NOTHING`
- Insert chunks: batch 50, cast embedding sang `vector(3072)`
- Tự động populate `searchVector` cho FTS
- Checkpoint: resume nếu bị ngắt

**HOẶC** nếu chỉ cần patch clean data lên DB đã có sẵn (không cần re-embed):
```bash
python3 scripts/apply-clean-to-db.py
```

**Verify sau khi seed:**
```bash
docker exec vibe-db psql -U vibe_user -d vibe_db -c "
  SELECT
    (SELECT COUNT(*) FROM \"Work\" WHERE status='published' AND \"deletedAt\" IS NULL) AS works,
    (SELECT COUNT(*) FROM \"ChatChunk\") AS chunks,
    (SELECT COUNT(*) FROM \"ChatChunk\" WHERE embedding IS NOT NULL) AS with_vectors,
    (SELECT COUNT(*) FROM \"Work\" WHERE \"searchVector\" IS NOT NULL) AS with_fts;
"
```

---

### Phase 9 — Deploy Production (~15-30 phút)

**Option A: Code-only deploy (nếu DB không thay đổi)**
```bash
# GitHub Actions tự build khi push to master
git push origin master
# Sau khi CI xong (~5 phút):
ssh root@188.166.177.93 "cd /app && docker pull vietdungregister/nthl:latest && \
  docker compose stop app && docker compose up -d app"
```

**Option B: Full DB deploy (nếu có dữ liệu mới)**
```bash
# 1. Export DB dump local
export PATH="/usr/local/bin:$PATH"
docker exec vibe-db pg_dump -U vibe_user -d vibe_db \
  --no-owner --no-privileges --clean --if-exists \
  -F custom -f /tmp/db.dump
docker cp vibe-db:/tmp/db.dump ./db.dump

# 2. Upload lên server
rsync -avz --progress --partial db.dump root@188.166.177.93:~/

# 3. Restore trên server (nohup vì mất 1-2 giờ)
ssh root@188.166.177.93 'nohup bash -c "
  docker cp ~/db.dump vibe-db:/tmp/db.dump &&
  docker exec vibe-db pg_restore -U vibe_user -d vibe_db \
    --clean --if-exists --no-owner --no-privileges /tmp/db.dump &&
  docker exec vibe-db rm /tmp/db.dump &&
  rm ~/db.dump
" > /tmp/restore.log 2>&1 &'

# 4. Monitor
ssh root@188.166.177.93 'tail -f /tmp/restore.log'

# 5. Verify
ssh root@188.166.177.93 'docker exec vibe-db psql -U vibe_user -d vibe_db -c "
  SELECT COUNT(*) FROM \"Work\" WHERE status='"'"'published'"'"' AND \"deletedAt\" IS NULL;"'
```

---

## Search Algorithm — Progressive Phrase Matching

### Kiến trúc hiện tại (đã tối ưu)

Khi user gõ `"một bài thơ hay"`:

```
Step 1: phraseto_tsquery('một bài thơ hay')  → Nhóm A (exact 4-word phrase)
Step 2: phraseto_tsquery('một bài thơ')      → Nhóm B (3-word prefix, exclude A)
Step 3: phraseto_tsquery('bài thơ')           → Nhóm C (2-word prefix, exclude A+B)
```

**Cách hoạt động:**
1. Tách query thành từ: `['một', 'bài', 'thơ', 'hay']`
2. Thử cụm dài nhất trước, bỏ từ phải mỗi bước
3. Mỗi bước dùng `phraseto_tsquery` (GIN index, nhanh ~5ms)
4. Short-circuit: tổng ≥ 50 → dừng
5. Ngưỡng: tối thiểu 2 từ

**Ranking (Composite Score):**
```
score = tier_boost × 1.5 + similarity(title, query)
```

Trong đó:
- `tier_boost = (maxTier - currentTier + 1) / maxTier` (cụm match dài → score cao hơn)
- `similarity(title, query)` từ pg_trgm (title càng giống query → lên trên)

**Ví dụ** query "một bài thơ hay" (maxTier=3, 3 steps):

| Title | Tier | tier_boost | similarity | Score |
|---|---|---|---|---|
| "Tìm một bài thơ hay" | 1 | 1.0 | 0.84 | **2.34** |
| "Một bài thơ" | 2 | 0.67 | 0.75 | **1.75** |
| "XII. CHƠI" | 1 | 1.0 | 0.00 | **1.50** |

**Fallbacks:**
1. **Fuzzy** (pg_trgm similarity > 0.2): khi progressive < 5 kết quả → tìm sai chính tả
2. **AI Semantic** (vector search): khi keyword = 0 kết quả → client gọi `/api/ai-search`

### DB Indexes cho Search

| Index | Type | Mục đích |
|---|---|---|
| `Work_searchVector_idx` | GIN (tsvector) | `phraseto_tsquery` lookup |
| `Work_fts_gin_idx` | GIN (tsvector) | FTS trên title+excerpt+content |
| `Work_title_trgm_idx` | GIN (pg_trgm) | `similarity()` ranking nhanh |

---

## Quick Start — Import file JSON mới

```bash
cd /Users/duongvietdung/Documents/Projects/baitapcuoikhoa

# 1. Đặt file JSON mới vào thư mục posts/
# 2. Parse
python3 scripts/build-data.py

# 3. Clean + Classify + Structural (tất cả trong 1 script)
python3 scripts/clean-data.py

# 4. Embed (nếu cần AI search — tốn $)
python3 scripts/generate_embeddings.py

# 5. Seed vào DB local
python3 scripts/seed_db.py

# 6. Deploy lên production (xem Phase 8 ở trên)
```

## Quick Start — Import file JSON thủ công (không từ Facebook)

Nếu tác giả gửi JSON dạng custom (không phải Facebook export), file JSON phải theo format:

```json
[
  {
    "title": "Tên tác phẩm",
    "content": "Nội dung đầy đủ\nDòng 2\nDòng 3",
    "genre": "poem",
    "publishedAt": "2026-01-15T00:00:00Z"
  }
]
```

Đặt vào `output/data/custom_import.json`, rồi chạy clean → embed → seed:
```bash
# Merge vào works.json trước, hoặc sửa build-data.py để đọc thêm file này
python3 scripts/clean-data.py
python3 scripts/generate_embeddings.py
python3 scripts/seed_db.py
```

## Thời gian ước tính (full pipeline)

| Phase | Thời gian | Chi phí |
|---|---|---|
| 1. Parse JSON | ~30 giây | $0 |
| 2. Regex Clean | ~10 giây | $0 |
| 3. AI Genre Classify (GPT-4o) | ~1-2 giờ | ~$0.30 |
| 4. Structural + Dedup | ~5 giây | $0 |
| 5. Smart Chunk | ~10 giây | $0 |
| 6. Style Guide (GPT-4o, 1 lần) | ~15 phút | ~$5 |
| 7a. GPT-4o Describe (5 tính thơ) | ~4-6 giờ | ~$40 |
| 7b. Embed (text-embedding-3-large) | ~30 phút | ~$1 |
| 8. Seed DB | ~5-10 phút | $0 |
| 9. Deploy Production | ~15-30 phút | $0 |
| **Tổng (lần đầu)** | **~6-9 giờ** | **~$46** |
| **Tổng (incremental, <100 bài)** | **~30 phút** | **~$1** |

> **Incremental import** (thêm vài chục bài): Phase 6 đã cache, Phase 7a chỉ describe bài mới
> → tổng ~30 phút + deploy. Phase 7a là chi phí lớn nhất (GPT-4o describe 133K chunks)
> nhưng chỉ chạy 1 lần cho bài đã có.

## Lưu ý quan trọng

- **Bài mới thêm qua CMS web** → tự động chunk + embed (KHÔNG cần chạy script)
- **Bài import qua JSON** → PHẢI chạy đủ pipeline trên
- **Tất cả scripts có checkpoint/resume** — nếu bị ngắt giữa chừng, chạy lại sẽ tiếp tục
- **OpenAI API key** phải có trong `.env` (`OPENAI_API_KEY`)
- **Docker Desktop** phải chạy (cho Phase 7)
- **Không cần restart server** sau deploy — search hoạt động ngay
- **Log**: `output/clean-data.log` chứa log chi tiết của clean pipeline
