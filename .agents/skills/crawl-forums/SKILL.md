---
name: crawl-forums
description: |
  Crawl tác phẩm văn học Nguyễn Thế Hoàng Linh từ các diễn đàn trực tuyến
  (tienve.org, gio-o.com, ttvnol.com) → phân loại genre AI → dedup → embed → import DB →
  deploy production.
  Bao gồm: crawl multi-forum → parse & clean → AI genre classify (GPT-4o-mini) →
  hash-based dedup → chunk + embed (text-embedding-3-large) → seed PostgreSQL/pgvector →
  deploy DigitalOcean server.
---

# Crawl & Import Forum Works — NTHL Literary Archive

## Mục tiêu cốt lõi

Trích xuất tất cả tác phẩm của Nguyễn Thế Hoàng Linh (bút danh "away" trên TTVNOL)
từ 4 nguồn diễn đàn bên ngoài, phân loại thể loại tự động bằng AI, loại bỏ bài trùng
với database hiện có (~23,900+ works), tạo vector embeddings cho AI search, import vào
PostgreSQL/pgvector, và deploy lên production server.

## Khi nào dùng

- Phát hiện nguồn bài viết mới trên diễn đàn/blog cần thu thập
- Mở rộng kho tác phẩm từ các nguồn ngoài Facebook
- Cần crawl forum có pagination (XenForo, WordPress, custom PHP)

## ⚠️ Bẫy (Pitfalls) đã rút kinh nghiệm

> **CRITICAL — Mỗi mục dưới đây là lỗi thực tế đã xảy ra.**

### 1. XenForo version matters
TTVNOL dùng **XenForo 1.x** (KHÔNG PHẢI 2.x):
```
✅ XenForo 1.x: li.message, a.username, span.DateTime, div.messageContent
❌ XenForo 2.x: article.message, a.username--bold, time.u-dt, div.bbWrapper
```
**LUÔN kiểm tra HTML thực tế** trước khi code parser. Dùng browser DevTools hoặc
fetch 1 trang rồi inspect cấu trúc.

### 2. Tienve.org cần click vào từng bài
Trang tác giả tienve chỉ liệt kê danh sách link — **phải crawl từng trang chi tiết**
để lấy nội dung đầy đủ. Nội dung nằm trong table layout, cần extract bằng text markers
(tên tác giả → footer).

### 3. Gio-o.com trả 502 thường xuyên
Máy chủ yếu, thường xuyên trả HTTP 502/503.
**Giải pháp**: Skip gracefully, ghi file JSON rỗng, tiếp tục pipeline.
KHÔNG retry vô hạn — sẽ block cả pipeline.

### 4. TTVNOL pagination URL
```
Trang 1: http://ttvnol.com/threads/slug.TOPIC_ID/
Trang N: http://ttvnol.com/threads/slug.TOPIC_ID/page-N
```
KHÔNG CÓ `page-1` — trang đầu là URL gốc.

### 5. Ngày tháng KHÔNG BAO GIỜ null
User yêu cầu: nếu nguồn không có ngày (tienve, gioo) → dùng ngày hiện tại.
PostgreSQL schema yêu cầu `publishedAt NOT NULL`.

### 6. Genre PHẢI dùng "stt" KHÔNG PHẢI "prose"
Database đã migrate "prose" → "stt" (status/ghi chú).
Genres hợp lệ: `poem`, `stt`, `essay`, `short_story`, `memoir`, `children`

### 7. Dedup phải dùng hash O(1), KHÔNG dùng Levenshtein O(n²)
1,641 forum works × 23,921 DB works = 39 triệu phép so sánh Levenshtein
→ chạy hàng giờ trên M-series Mac. **Hash-based (slug + normalized title)**: < 1 giây.

### 8. "Giữ nhầm hơn bỏ sót"
Bài nghi trùng (title giống nhưng có thể khác bản) → import với `status='draft'` +
ghi chú `seoDescription` để admin review qua CMS. KHÔNG tự ý xoá.

### 9. Production server disk
Server 24GB disk có thể hết dung lượng khi copy dump 1.6GB vào Docker container.
**LUÔN chạy** `docker builder prune -f && docker image prune -f` trước khi restore.

### 10. SSH timeout khi restore DB lớn
`pg_restore` dump 1.6GB+ mất ~2 giờ trên VPS 2GB RAM.
SSH session có thể bị timeout. **Giải pháp**: dùng `nohup` hoặc `tmux` trên server.

## Kiến trúc Pipeline (7 Phases)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Phase 1    │     │   Phase 2    │     │   Phase 3    │
│   CRAWL      │────▶│  PARSE &     │────▶│   AI GENRE   │
│  (4 nguồn)   │     │   CLEAN      │     │  CLASSIFY    │
└──────────────┘     └──────────────┘     └──────────────┘
        │                                        │
        ▼                                        ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Phase 6    │     │   Phase 5    │     │   Phase 4    │
│   SEED DB    │◀────│  CHUNK &     │◀────│    DEDUP     │
│              │     │   EMBED      │     │  (hash O(1)) │
└──────────────┘     └──────────────┘     └──────────────┘
        │
        ▼
┌──────────────┐
│   Phase 7    │
│   DEPLOY     │
│  (DB only)   │
└──────────────┘
```

## Điều kiện tiên quyết

### Local (Mac)
- Python 3.12+ với: `requests`, `beautifulsoup4`, `openai`, `psycopg2-binary`
- Docker Desktop chạy (cần cho Phase 4, 5, 6)
- PostgreSQL local (`vibe-db` container) với dữ liệu hiện tại
- `OPENAI_API_KEY` trong `.env` (cho Phase 3, 5)
- `DATABASE_URL` trong `.env` (cho Phase 4, 6)

### Server (DigitalOcean)
- SSH access tới `188.166.177.93` (hoặc server IP)
- Container `vibe-db` đang chạy
- Disk trống ≥ 3GB (cho DB dump + restore)

## Variables cheat sheet

| Variable | Giá trị hiện tại | Mô tả |
|---|---|---|
| `PROJECT_DIR` | `/Users/duongvietdung/Documents/Projects/baitapcuoikhoa` | Root project |
| `SCRIPTS_DIR` | `scripts/crawl-forums/` | Thư mục scripts |
| `OUTPUT_CRAWLED` | `output/crawled/` | Raw JSON từ crawl |
| `OUTPUT_DATA` | `output/data/` | Processed JSON |
| `TTVNOL_AUTHOR` | `away` (userId 45078) | Bút danh trên TTVNOL |
| `EMBED_MODEL` | `text-embedding-3-large` | Model embedding (3072d) |
| `CLASSIFY_MODEL` | `gpt-4o-mini` | Model phân loại genre |
| `SERVER_IP` | `188.166.177.93` | Production server |

## Cấu trúc thư mục

```
baitapcuoikhoa/
├── scripts/crawl-forums/
│   ├── crawl-tienve.py          # Phase 1a
│   ├── crawl-gioo.py            # Phase 1b
│   ├── crawl-ttvnol.py          # Phase 1c,d (--topic 221106|51077|all)
│   ├── parse-forum-works.py     # Phase 2
│   ├── classify-genres.py       # Phase 3
│   ├── dedup-forum-works.py     # Phase 4
│   ├── chunk-and-embed-forums.py # Phase 5
│   └── seed-forum-works.py      # Phase 6
├── output/
│   ├── crawled/
│   │   ├── tienve_raw.json
│   │   ├── gioo_raw.json
│   │   ├── ttvnol_221106_raw.json
│   │   └── ttvnol_51077_raw.json
│   └── data/
│       ├── forum_works.json              # Phase 2 output
│       ├── forum_works_new.json          # Phase 4 output (sau dedup)
│       ├── forum_works_duplicates.json   # Bài trùng (cho admin review)
│       └── forum_chunks_with_embeddings.json  # Phase 5 output
└── .env   # OPENAI_API_KEY, DATABASE_URL
```

---

## Quy trình thực thi chi tiết

---

### Phase 1 — Crawl (4 nguồn, song song nếu có thể)

**1a. Tienve.org** (~2 phút, 18-20 tác phẩm)
```bash
cd $PROJECT_DIR
python3 scripts/crawl-forums/crawl-tienve.py
```
- Fetch trang tác giả → parse danh sách link
- Click vào từng bài lấy nội dung đầy đủ
- Output: `output/crawled/tienve_raw.json`
- **Lưu ý**: Ngày = null (tienve không hiện ngày gốc) → Phase 2 sẽ dùng ngày hiện tại

**1b. Gio-o.com** (~3 phút, 15-25 tác phẩm)
```bash
python3 scripts/crawl-forums/crawl-gioo.py
```
- Fetch index → crawl từng trang chi tiết
- Nếu 502/503 → ghi file JSON rỗng, tiếp tục
- Output: `output/crawled/gioo_raw.json`

**1c+1d. TTVNOL** (~15-30 phút, 200-1500+ posts)
```bash
# Chạy song song 2 topic
python3 scripts/crawl-forums/crawl-ttvnol.py --topic 221106 &
sleep 3
python3 scripts/crawl-forums/crawl-ttvnol.py --topic 51077 &
wait
```
- Lọc chỉ posts của user `away`
- Loại bỏ quote blocks, signature
- Checkpoint mỗi 5 trang → resume nếu bị ngắt
- Output: `output/crawled/ttvnol_{id}_raw.json`
- **Delay**: 1.5s giữa mỗi request (tránh bị block)

**Kết quả tham khảo (lần chạy thực tế):**
| Nguồn | Số lượng |
|---|---|
| tienve.org | 19 tác phẩm |
| gio-o.com | 18 tác phẩm |
| ttvnol #221106 | 203 posts |
| ttvnol #51077 | 1,403 posts |
| **Tổng** | **1,643 items** |

---

### Phase 2 — Parse & Clean (~5 giây)

```bash
python3 scripts/crawl-forums/parse-forum-works.py
```

- Đọc 4 file raw JSON → chuẩn hoá format
- Sinh `slug` unique (Vietnamese NFD → ASCII → kebab-case)
- `publishedAt` null → dùng ngày hiện tại (đánh dấu `needsDateEstimate`)
- Filter bài trống (<10 ký tự)
- Output: `output/data/forum_works.json`

**Raw JSON format (mỗi item):**
```json
{
  "id": "uuid-v4",
  "title": "Tên bài",
  "slug": "ten-bai",
  "genre": "stt",
  "content": "Nội dung đã clean",
  "excerpt": "200 ký tự đầu...",
  "status": "published",
  "publishedAt": "2005-09-10T00:00:00Z",
  "source": "ttvnol",
  "sourceUrl": "http://...",
  "needsGenreClassification": true,
  "needsDateEstimate": false
}
```

---

### Phase 3 — AI Genre Classification (~15-25 phút, ~$0.10-0.20)

```bash
python3 scripts/crawl-forums/classify-genres.py
```

- Gọi GPT-4o-mini cho mỗi bài với system prompt chuyên gia VN literature
- 6 genres: `poem`, `stt`, `essay`, `short_story`, `memoir`, `children`
- Batch 20, checkpoint mỗi 50, resume nếu bị ngắt
- Rate limit protection với sleep 300ms
- Cập nhật trực tiếp `forum_works.json`

**System prompt cốt lõi:**
```
Bạn là chuyên gia phân loại thể loại văn học Việt Nam.
Phân loại văn bản vào MỘT thể loại:
- poem: Thơ (có vần điệu hoặc dòng ngắn theo nhịp, trữ tình)
- essay: Tản văn / Tuỳ bút
- short_story: Truyện ngắn (có cốt truyện, nhân vật)
- memoir: Bút ký (ghi chép trải nghiệm cá nhân)
- stt: Status / Ghi chú (đoạn ngắn, suy nghĩ tự do)
- children: Thơ / văn thiếu nhi
Chỉ trả lời tên thể loại, không giải thích.
```

**Kết quả tham khảo:**
| Genre | Số lượng |
|---|---|
| poem | 1,229 |
| stt | 186 |
| essay | 150 |
| short_story | 45 |
| memoir | 22 |
| children | 9 |

---

### Phase 4 — Dedup vs existing DB (<1 giây)

```bash
python3 scripts/crawl-forums/dedup-forum-works.py
```

- Hash-based O(1) lookup: slug exact + normalized title
- Slug trùng → skip (ON CONFLICT sẽ xử lý)
- Title trùng → import với `status='draft'` + ghi chú admin review
- Output: `forum_works_new.json` + `forum_works_duplicates.json`

**Chiến lược "giữ nhầm hơn bỏ sót":**
| Match type | Hành động |
|---|---|
| Slug exact match | Skip (chắc chắn trùng) |
| Title normalized match | Import as `draft` (admin review) |
| Không match | Import as `published` |

---

### Phase 5 — Chunk + Embeddings (~30-50 phút, ~$0.12-0.15)

```bash
python3 scripts/crawl-forums/chunk-and-embed-forums.py
```

- Chunk: 1-2 dòng mỗi chunk, merge dòng ngắn, split dòng dài
- Embed: OpenAI `text-embedding-3-large` (3072 dimensions)
- Batch 100 chunks per API call
- Checkpoint mỗi 500 chunks
- Resume, retry (5x), rate limit protection
- Output: `forum_chunks_with_embeddings.json`

**Stats tham khảo:**
- 1,641 works → 64,896 chunks
- ~954K tokens → ~$0.124
- Tốc độ: 15-100 chunks/s (giảm dần do rate limit)

---

### Phase 6 — Seed DB (~5-10 phút)

```bash
python3 scripts/crawl-forums/seed-forum-works.py
```

- Insert works: batch 200, `ON CONFLICT (slug) DO NOTHING`
- Insert chunks: batch 50, update embedding as `vector(3072)`
- Verify counts after import

**SQL insert pattern (quan trọng):**
```sql
INSERT INTO "Work" (id, title, slug, genre, content, ...)
VALUES %s ON CONFLICT (slug) DO NOTHING;

INSERT INTO "ChatChunk" (id, "workId", content, score, "isBlocked", "createdAt")
VALUES %s ON CONFLICT (id) DO NOTHING;

-- Embedding phải cast sang vector type
UPDATE "ChatChunk" SET embedding = %s::vector WHERE id = %s;
```

---

### Phase 7 — Deploy to Production (~15-30 phút)

Chỉ cần sync DB (không cần rebuild Docker image hay upload media):

```bash
# 1. Export DB dump local
docker exec vibe-db pg_dump -U vibe_user -d vibe_db \
  --no-owner --no-privileges --clean --if-exists \
  -F custom -f /tmp/db.dump
docker cp vibe-db:/tmp/db.dump ./db.dump

# 2. Dọn dẹp server (QUAN TRỌNG - tránh hết disk!)
ssh root@$SERVER_IP 'docker builder prune -f && docker image prune -f'

# 3. Upload
rsync -avz --progress --partial db.dump root@$SERVER_IP:~/

# 4. Restore (dùng nohup để tránh SSH timeout)
ssh root@$SERVER_IP 'nohup bash -c "
  docker cp ~/db.dump vibe-db:/tmp/db.dump &&
  docker exec vibe-db pg_restore -U vibe_user -d vibe_db \
    --clean --if-exists --no-owner --no-privileges /tmp/db.dump &&
  docker exec vibe-db rm /tmp/db.dump &&
  rm ~/db.dump
" > /tmp/restore.log 2>&1 &'

# 5. Verify
ssh root@$SERVER_IP 'docker exec vibe-db psql -U vibe_user -d vibe_db -c "
  SELECT '"'"'works'"'"' AS e, COUNT(*) FROM \"Work\"
  UNION ALL SELECT '"'"'chunks'"'"', COUNT(*) FROM \"ChatChunk\";"'
```

---

## Thêm nguồn mới (Extending)

Để crawl thêm một diễn đàn/blog mới:

### 1. Tạo script crawl mới
```bash
cp scripts/crawl-forums/crawl-gioo.py scripts/crawl-forums/crawl-NEWSOURCE.py
```

Mỗi script crawl PHẢI output JSON với format:
```json
{
  "source": "newsource",
  "sourceUrl": "https://...",
  "title": "Tên bài (nếu có)",
  "content": "Nội dung text đã clean",
  "genreHint": "",
  "publishedAt": "2005-09-10T00:00:00Z"
}
```

### 2. Thêm vào parse-forum-works.py
```python
RAW_FILES = [
    ...existing...,
    CRAWLED_DIR / "newsource_raw.json",
]
```

### 3. Chạy Phase 2-7 như bình thường
Pipeline từ Phase 2 trở đi là source-agnostic.

---

## Thời gian ước tính

| Phase | Thời gian | Chi phí |
|---|---|---|
| 1. Crawl (4 nguồn) | 15-30 phút | $0 |
| 2. Parse & Clean | <5 giây | $0 |
| 3. AI Genre Classify | 15-25 phút | ~$0.15 |
| 4. Dedup | <1 giây | $0 |
| 5. Chunk + Embed | 30-50 phút | ~$0.13 |
| 6. Seed DB | 5-10 phút | $0 |
| 7. Deploy | 15-30 phút | $0 |
| **Tổng** | **~1.5-2.5 giờ** | **~$0.28** |

## Quick Start (chạy tất cả nối tiếp)

```bash
cd /Users/duongvietdung/Documents/Projects/baitapcuoikhoa

# Phase 1: Crawl
python3 scripts/crawl-forums/crawl-tienve.py
python3 scripts/crawl-forums/crawl-gioo.py
python3 scripts/crawl-forums/crawl-ttvnol.py --topic all

# Phase 2-6: Process & Import
python3 scripts/crawl-forums/parse-forum-works.py
python3 scripts/crawl-forums/classify-genres.py
python3 scripts/crawl-forums/dedup-forum-works.py
python3 scripts/crawl-forums/chunk-and-embed-forums.py
python3 scripts/crawl-forums/seed-forum-works.py

# Phase 7: Deploy (xem chi tiết ở trên)
```

## Lưu ý quan trọng

- **Tất cả scripts có checkpoint/resume** — nếu bị ngắt giữa chừng, chạy lại sẽ tiếp tục
- **OpenAI API key** phải có trong `.env` (`OPENAI_API_KEY`)
- **Docker Desktop** phải chạy cho Phase 4, 5, 6
- **Bài draft** cần admin review qua CMS → filter `status=draft`
- **Không cần restart server** sau deploy — search hoạt động ngay
- **HNSW index** có thể cần rebuild nếu thêm nhiều chunks (xem deploy-to-server skill)
