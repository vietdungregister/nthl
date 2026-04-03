---
name: import-works
description: |
  Import tác phẩm mới từ file JSON (Facebook export hoặc JSON thủ công) vào database NTHL.
  Bao gồm: parse → chunk → embedding → seed DB → verify.
---

# Import Works từ JSON — NTHL

## Khi nào dùng
- Tác giả gửi thêm file Facebook export JSON mới
- Cần import batch tác phẩm từ file JSON

## Cấu trúc thư mục
```
baitapcuoikhoa/
├── facebook-nguyenthehoanglinh-06_03_2026-y1cYzpJi/
│   └── your_facebook_activity/
│       └── posts/
│           ├── your_posts__check_ins__photos_and_videos_1.json
│           └── your_posts__check_ins__photos_and_videos_2.json  ← file mới
├── output/data/
│   ├── works.json                  ← output của build_data.py
│   ├── chunks.json                 ← output của build_data.py
│   ├── chunks_with_embeddings.json ← output của generate_embeddings.py
└── scripts/
    ├── build_data.py (hoặc ở root)
    ├── generate_embeddings.py
    └── seed_db.py
```

## Các bước thực hiện

### Bước 1 — Đặt file JSON mới vào đúng chỗ
Copy file JSON mới vào thư mục posts của Facebook export với tên đúng thứ tự:
```
facebook-nguyenthehoanglinh-06_03_2026-y1cYzpJi/your_facebook_activity/posts/your_posts__check_ins__photos_and_videos_N.json
```
(N = số thứ tự tiếp theo)

### Bước 2 — Parse & chunk
```bash
cd /Users/duongvietdung/Documents/Projects/baitapcuoikhoa
python3 build_data.py
```
Output:
- `output/data/works.json` — tất cả tác phẩm
- `output/data/chunks.json` — chunks chưa có embedding

### Bước 3 — Tạo embeddings (gọi OpenAI API)
```bash
python3 scripts/generate_embeddings.py
```
- Chi phí ước tính: ~$0.01 / 1000 chunks
- Có checkpoint: nếu bị ngắt giữa chừng, chạy lại sẽ tiếp tục
- Output: `output/data/chunks_with_embeddings.json`

### Bước 4 — Import vào DB
```bash
python3 scripts/seed_db.py
```
- Tự động **skip** bài đã tồn tại (dedup theo slug)
- Chỉ insert bài mới
- Có checkpoint: nếu bị ngắt có thể chạy lại

### Bước 5 — Verify
```bash
docker exec vibe-db psql -U vibe_user -d vibe_db -c "
  SELECT
    (SELECT COUNT(*) FROM \"Work\" WHERE status='published') as works,
    (SELECT COUNT(*) FROM \"ChatChunk\") as chunks,
    (SELECT COUNT(*) FROM \"ChatChunk\" WHERE embedding IS NOT NULL) as with_vectors;
"
```

Kết quả mong đợi: `with_vectors` tăng so với trước.

## Lưu ý quan trọng
- **Bài mới thêm qua CMS web** → tự động chunk + embed (không cần chạy script)
- **Bài import qua JSON** → phải chạy đủ 4 bước trên
- **OpenAI API key** phải có trong `.env` (OPENAI_API_KEY)
- Bước 3 có thể mất 5–30 phút tuỳ số lượng bài mới
- Không cần restart server sau khi import — search hoạt động ngay
