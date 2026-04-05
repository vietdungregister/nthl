# CLAUDE.md — Product Requirements Document
# Hệ Sinh Thái Văn Học Số: Nguyễn Thế Hoàng Linh

> **Phiên bản:** 2.1 (cập nhật 2026-04-04)
> **Loại sản phẩm:** CMS + Public Site + AI-Powered Search (Literary Archive & Personal Branding)
> **Tech:** Next.js 16 · PostgreSQL · Prisma · pgvector · OpenAI · Docker

---

## 1. Tổng Quan Sản Phẩm

### 1.1 Giới Thiệu

Web app "thư viện chính chủ" dành riêng cho nhà thơ **Nguyễn Thế Hoàng Linh** — tác giả ~10.000 tác phẩm (thơ, tiểu thuyết, tùy bút, tiểu luận, tranh, ảnh, video).

Hệ thống gồm 3 phần:
- **CMS (private):** Quản lý kho tác phẩm — tạo, sửa, xóa, phân loại, xuất bản.
- **Public Site (public):** Duyệt, đọc, tìm kiếm, chia sẻ tác phẩm.
- **AI Search Engine:** Tìm kiếm ngữ nghĩa kết hợp vector similarity + full-text search.

### 1.2 Mục Tiêu Cốt Lõi

1. **Lưu trữ tập trung:** Thay thế việc đăng rải rác trên mạng xã hội.
2. **Trải nghiệm đọc tốt:** Typography đẹp, mobile-first, không quảng cáo.
3. **Tìm kiếm thông minh:** Search theo nghĩa, cảm xúc, chủ đề (vector search).
4. **Khả năng lan tỏa:** SEO tốt, Open Graph, chia sẻ dễ dàng.
5. **Thương hiệu cá nhân:** Phản ánh phong cách giản dị, chân thành của tác giả.

### 1.3 Quy Mô Thực Tế

| Thông số | Giá trị |
|----------|---------|
| Số tác phẩm | ~23.921 (published) |
| Tổng dung lượng text | ~3-4 GB |
| Chunks cho AI search | ~133.000 |
| Vector dimensions | 3072 (text-embedding-3-large) |
| DB | PostgreSQL + pgvector tại localhost:5433 |
| Next.js version | 16.1.6 |

---

## 2. Hồ Sơ Tác Giả — Nguyễn Thế Hoàng Linh

### 2.1 Tiểu Sử

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên** | Nguyễn Thế Hoàng Linh |
| **Sinh** | 1982, Hà Nội |
| **Biệt danh** | "Thi tài tuổi 20" |
| **Học vấn** | ĐH Ngoại thương — bỏ năm 3 để chuyên tâm sáng tác |
| **Facebook** | [facebook.com/nguyenthehoanglinh](https://www.facebook.com/nguyenthehoanglinh) |

**Dấu mốc sự nghiệp:**
- 2004: *Chuyện của thiên tài* — Giải thưởng Hội Nhà văn Hà Nội
- 2005: Báo Tuổi Trẻ "Cuộc trả lời phỏng vấn cuối cùng (?)"
- 2021: *Bắt nạt* vào sách giáo khoa Ngữ văn lớp 6

### 2.2 Tác Phẩm Xuất Bản

**Thơ:** Mầm sống | Uống một ngụm nước biển | Lẽ giản đơn (2006) | Mỗi quốc gia là một thành phố của thế giới (2009) | Hở (2011) | Mật thư (2012) | Em giấu gì ở trong lòng thế (2013, chép tay) | Bé tập tô | Ra vườn nhặt nắng (2015, chứa "Bắt nạt") | Tôi Thức Tìm Cách Thức Để Ngủ

**Tiểu thuyết:** Chuyện của thiên tài (2004)

**Văn xuôi:** Đọc kỹ hướng dẫn sử dụng trước khi dùng | Văn chương động | Live/Play [Sống/Chơi]

### 2.3 Phong Cách → Quyết Định Thiết Kế

| Đặc trưng tác giả | Quyết định thiết kế |
|--------------------|---------------------|
| Giản dị, không màu mè | Layout tối giản, nhiều khoảng trắng |
| Thơ tự do, không niêm luật | **Bắt buộc** preserve line breaks, `white-space: pre-wrap` |
| Chép tay, gần gũi | Font Lora (serif ấm), texture giấy nhẹ |
| Internet generation | Mobile-first, load nhanh |
| Lan truyền qua MXH | Share button, OG image chuẩn |

### 2.4 Bộ Màu & Typography

```
Nền chính:    #FAFAF7  (trắng ngà)
Nền phụ:      #F2F0EB  (kem nhạt)
Text chính:   #1A1A18  (gần đen, ấm)
Text phụ:     #6B6860  (xám ấm)
Accent:       #8B6F47  (nâu đất)
Link:         #5C7A5C  (xanh sage)
Border:       #E5E2DC  (xám kem)
```

| Layer | Font |
|-------|------|
| Heading | `Playfair Display` (serif) |
| Body / Thơ | `Lora` (serif, line-height 2.0+) |
| UI / Navigation | `Inter` (sans-serif) |
| Max-width đọc | 640-680px |

---

## 3. Kiến Trúc Kỹ Thuật

### 3.1 Tech Stack Thực Tế

| Layer | Công nghệ |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + pgvector |
| ORM | Prisma |
| Auth | NextAuth.js (JWT, credentials) |
| Search | Hybrid: pgvector cosine + ILIKE text |
| Embedding | OpenAI text-embedding-3-large (3072d) |
| Styling | Vanilla CSS (KHÔNG Tailwind) |
| Deployment | Docker (docker-compose) |

### 3.2 Cấu Trúc App

```
src/app/
├── (public)/                    # Public site (sidebar layout)
│   ├── page.tsx                 # Homepage — feed + smart search + pagination
│   ├── layout.tsx               # 3-column: sidebar | feed | collections
│   ├── tac-pham/page.tsx        # Danh sách tác phẩm + smart search
│   ├── tim-kiem/page.tsx        # Trang Thủ Thư AI search
│   └── sach/page.tsx            # Danh sách sách
├── tac-pham/[slug]/page.tsx     # Chi tiết tác phẩm
├── gioi-thieu/page.tsx          # Giới thiệu tác giả
├── the-loai/[genre]/page.tsx    # Filter theo thể loại
├── tag/[slug]/page.tsx          # Filter theo tag
├── bo-suu-tap/[slug]/page.tsx   # Bộ sưu tập
├── sach/[slug]/page.tsx         # Chi tiết sách
├── cms/                         # CMS admin
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── works/                   # CRUD tác phẩm (phân trang, filter, sort)
│   ├── tags/, genres/, collections/, media/, books/, settings/
└── api/
    ├── ai-search/route.ts       # Hybrid vector + text search
    ├── works/route.ts           # CRUD + auto-indexing
    ├── works/[id]/route.ts      # Update + auto-re-index
    ├── auth/, tags/, genres/, collections/, media/, books/, comments/, author/
```

### 3.3 Components

```
src/components/
├── public/
│   ├── WorksSmartSearch.tsx     # Smart search tích hợp trong list
│   └── AILibrarian.tsx          # Trang Thủ Thư AI (sẽ thay bằng chat)
├── lazy/                        # Dynamic imports
│   ├── LazyAILibrarian.tsx
│   ├── LazyCommentSection.tsx
│   └── LazyDailyWorkBanner.tsx
├── PublicHeader.tsx             # Header công cộng
├── SidebarNav.tsx               # Sidebar navigation (client)
├── DailyWorkBanner.tsx          # Banner tác phẩm hàng ngày
├── ExpandableContent.tsx        # Expand/collapse nội dung dài
├── CommentSection.tsx           # Bình luận
└── SachAccordion.tsx            # Accordion cho trang sách
```

---

## 4. Data Model (Prisma Schema)

### 4.1 Core Models

**Work** — Tác phẩm (core entity, ~10K rows)
```
id, title, slug(unique), genre, content(text lớn), excerpt,
coverImageUrl, status(draft|published|scheduled), publishedAt,
scheduledAt, isFeatured, featuredDate,
writtenAt(DateTime? — ngày tác giả sáng tác, khác publishedAt),
translations(String? — JSON: [{ lang, title?, content, note? }]),
seoTitle, seoDescription, ogImageUrl, viewCount,
source("facebook"|null), fbTimestamp,
autoClassified, createdAt, updatedAt, deletedAt(soft delete)
→ tags[], collections[], comments[], chunks[]
```

**ChatChunk** — Chunks cho AI search (~133K rows)
```
id, workId→Work, content(1-2 dòng text),
embedding(vector 3072 — raw SQL, Prisma chưa hỗ trợ pgvector),
score(float, feedback tích lũy), isBlocked(tác giả block)
→ feedbacks[]
```

**Tag, Collection, WorkTag, WorkCollection** — Phân loại
**Genre** — Thể loại (value, label, emoji, order, showInSidebar)
  - Values: `stt` | `poem` | `essay` | `short_story` | `novel` | `memoir` | `children` | `photo` | `video`
  - ⚠️ Genre `prose` đã bị xóa (2026-04-04), tất cả works chuyển sang `stt`
**Book** — Sách đã xuất bản (title, slug, description, coverImage, buyUrl, publisher, year)
**AuthorProfile** — Singleton hồ sơ tác giả
**Comment** — Bình luận độc giả
**Media** — Thư viện media (filename, url, type, size, width, height)
**AdminUser** — Tài khoản admin (email, passwordHash, loginAttempts, lockUntil)
**AuthorInstruction** — Tác giả dạy AI (correction/rule/reclassify)
**AuthorMemory** — Bộ nhớ dài hạn AI (style/preference/philosophy)
**ChatFeedback** — Feedback cho chunks

### 4.2 Database Indexes

```sql
Work_status_deletedAt_publishedAt_idx  -- trang chủ + danh sách
Work_genre_status_deletedAt_idx        -- filter theo thể loại
Work_featuredDate_status_deletedAt_idx -- tác phẩm nổi bật theo ngày
Work_createdAt_idx                     -- CMS sort
Work_deletedAt_status_idx              -- dashboard COUNT
Work_fts_gin_idx                       -- Full-text search (GIN/tsvector)
ChatChunk_workId_idx                   -- join chunks → works
ChatChunk_isBlocked_score_idx          -- filter chunks
```

---

## 5. Search Engine — Hybrid Vector + Text Search

### 5.1 Kiến Trúc

```
User query → API /api/ai-search (POST)
    ├── OpenAI Embedding (text-embedding-3-large) → pgvector cosine distance → top-200 chunks
    ├── Text Search (ILIKE trên ChatChunk.content) → top-300 chunks
    ↓
    Merge + Score (vector ×2, text ×1) → Dedup by workId → Dedup by title
    ↓
    Trả về: { works: [{ id, title, slug, genre, publishedAt, writtenAt, preview_sentences[] }] }
```

### 5.2 API `/api/ai-search`

- **File:** `src/app/api/ai-search/route.ts`
- **Method:** POST `{ query: string, genre?: string }`
- **Response:** `{ works: AIWork[] }` — không giới hạn số lượng
- **Không có AI analysis** — chỉ embedding query + search, không gọi gpt-4o-mini

### 5.3 Tách câu & Preview

- Split chunk content theo `\n` (KHÔNG dùng `.!?` regex — thơ VN không có dấu câu đều đặn)
- Trả tất cả dòng match dưới dạng `preview_sentences[]`
- Frontend random chọn 1 dòng mỗi lần render

### 5.4 Dedup 2 Tầng

1. **By workId** — trong Map khi merge vector + text results
2. **By title** — lọc bài trùng tiêu đề (do import Facebook 2 lần)

### 5.5 Quy Tắc Quan Trọng

- **KHÔNG** slice/cap kết quả — trả hết, frontend phân trang
- **KHÔNG** lưu results vào sessionStorage — chỉ lưu query + filters
- **PHẢI** split theo `\n` không phải regex dấu câu
- `preview_sentences` trả tất cả dòng, frontend random 1 dòng

---

## 6. Auto-Indexing Pipeline

### 6.1 Hai Luồng Thêm Tác Phẩm

| Cách thêm | Pipeline | Tự động? |
|---|---|---|
| **CMS web** (thêm/sửa qua UI) | `POST/PUT /api/works` → `after()` → `chunkAndEmbed()` | ✅ Tự động |
| **File JSON** (Facebook export) | `build_data.py → generate_embeddings.py → seed_db.py` | ❌ Thủ công (xem skill `import-works`) |

### 6.2 Service `chunkAndEmbed`

- **File:** `src/lib/chunkAndEmbed.ts`
- Chạy trong `after()` — background, không block response
- Flow: Xóa chunks cũ → tách paragraphs/lines → batch embed (50/call OpenAI) → insert ChatChunk
- Fallback: nếu embedding API lỗi → vẫn lưu chunk không vector (text search vẫn hoạt động)

### 6.3 Trigger Points

| API | File | Trigger |
|---|---|---|
| `POST /api/works` | `src/app/api/works/route.ts` | Tạo work mới có content |
| `PUT /api/works/[id]` | `src/app/api/works/[id]/route.ts` | Cập nhật content |

### 6.4 Import Batch từ JSON

Xem skill `.agents/skills/import-works/SKILL.md` — pipeline 4 bước:
```
build_data.py (parse FB JSON) → generate_embeddings.py (OpenAI) → seed_db.py (import DB) → verify
```

---

## 7. Frontend Search Components

### 7.1 `WorksSmartSearch`

- **File:** `src/components/public/WorksSmartSearch.tsx`
- Client component, wrap quanh server-rendered list (children pattern)
- Khi search active → hiện kết quả semantic (vector+text), ẩn list thường
- Khi clear → hiện lại list thường (server-rendered)
- Filter năm/tháng/ngày (client-side) trên kết quả
- **Được dùng tại:** Homepage `/` và `/tac-pham`

### 7.2 `AILibrarian`

- **File:** `src/components/public/AILibrarian.tsx`
- Cùng logic search/render như WorksSmartSearch
- Được dùng tại `/tim-kiem`
- **Kế hoạch:** sau này thay bằng AI chat

### 7.3 Kết Quả Search — Card Layout

Mỗi card hiển thị:
1. **Genre badge** (Thơ/Tùy bút/Ảnh/Video)
2. **Rank** (#1, #2,...) — vị trí relevance
3. **Ngày sáng tác** (dd/mm/yyyy) — ưu tiên `writtenAt`, fallback `publishedAt`
4. **Title** (Playfair Display, 16px, bold)
5. **1 câu random** — trích từ `preview_sentences[]`, random mỗi lần render

### 7.4 SessionStorage Pattern

Áp dụng cho cả 2 component:
```
Lưu: { query, page, filterYear, filterMonth, filterDay, expiry }
KHÔNG lưu: results (tiết kiệm memory)
Khi restore: auto re-search bằng query đã lưu
TTL: 15 phút
Key: works-smart-search:${genre||'all'} hoặc ai-lib-state
```

---

## 8. Pagination & Rendering Strategy

### 8.1 Các Trang Có Pagination

| Trang | Pagination | Page size |
|---|---|---|
| Homepage `/` | Server-side `?page=N` | 20/trang |
| Tác phẩm `/tac-pham` | Server-side `?page=N` | 20/trang |
| Kết quả smart search | Client-side | 20/trang |
| CMS Tác phẩm `/cms/works` | Client-side `?page=N` | 50/trang |

Pagination hiển thị: tổng số bài, page numbers, Đầu/Cuối, ellipsis cho pages xa.

### 8.2 Rendering Mode

| Trang | Mode | Lý do |
|---|---|---|
| Homepage `/` | `force-dynamic` | Pagination + smart search |
| `/tac-pham` | `force-dynamic` | Filters + pagination |
| `/gioi-thieu` | `revalidate = 86400` | Gần static |
| Public layout | `revalidate = 300` | Sidebar data (genres, books, collections) |
| CMS pages | `force-dynamic` | Admin realtime |

---

## 8.5 CMS Quản Lý Tác Phẩm (`/cms/works`)

### Filter

| Filter | Param | Ghi chú |
|---|---|---|
| Tìm kiếm text | `?search=` | Tìm theo title + content + excerpt (case-insensitive) |
| Trạng thái | `?status=` | published / draft / scheduled |
| Thể loại | `?genre=` | Dropdown từ DB + hardcoded photo/video |
| Tag | `?tag=slug` | Filter qua WorkTag → Tag |
| Khoảng ngày tạo | `?dateFrom=&dateTo=` | Filter trên `createdAt` |
| Khoảng ngày sáng tác | `?writtenFrom=&writtenTo=` | Filter trên `writtenAt` |

### Sort

| Giá trị `?sort=` | Mô tả |
|---|---|
| `newest` (mặc định) | Ngày tạo mới nhất |
| `oldest` | Ngày tạo cũ nhất |
| `title` | Tiêu đề A → Z |
| `title_desc` | Tiêu đề Z → A |
| `writtenAt_desc` | Sáng tác mới nhất |
| `writtenAt_asc` | Sáng tác cũ nhất |
| `views` | Lượt xem cao nhất |

### Bảng hiển thị

7 cột: Tiêu đề | Thể loại | Trạng thái | Lượt xem | Ngày sáng tác | Ngày tạo | Thao tác

Nút "✕ Xóa bộ lọc" hiện khi có filter/sort active.

---

## 8.6 Hiển Thị Ngày Trên Public

Tất cả vị trí hiển thị ngày trên public FE ưu tiên **`writtenAt`** (ngày tác giả sáng tác), fallback về `publishedAt`:

| Vị trí | File |
|---|---|
| Homepage feed card | `src/app/(public)/page.tsx` |
| Danh sách tác phẩm | `src/app/(public)/tac-pham/page.tsx` |
| Search results (WorksSmartSearch) | `src/components/public/WorksSmartSearch.tsx` |
| Search results (AILibrarian) | `src/components/public/AILibrarian.tsx` |
| Trang chi tiết tác phẩm | `src/app/tac-pham/[slug]/page.tsx` |

## 8.7 Bản Dịch (Translations)

- **Hiển thị tại:** Trang chi tiết tác phẩm `/tac-pham/[slug]`
- **Dữ liệu:** `work.translations` — JSON string chứa array `[{ lang, title?, content, note? }]`
- **UI:** Section "Bản dịch" sau nội dung chính, mỗi bản dịch hiện: tên ngôn ngữ, tiêu đề (nếu có), ghi chú (nếu có), nội dung dạng prose với border trái
- **Fallback:** Nếu JSON parse lỗi hoặc rỗng → ẩn section

---

## 9. Quy Tắc Code Bắt Buộc

### 9.1 Database Queries

- ❌ **KHÔNG** `prisma.work.findMany({})` không có `select` — mặc định load `content` (hàng trăm KB/row)
- ✅ Luôn dùng `select: { id, title, slug, genre, excerpt, ... }` trong list views
- ❌ **KHÔNG** `{ content: { contains: query } }` — LIKE scan 3-4GB = thảm họa
- ✅ Search phải qua `/api/ai-search` (vector + ILIKE trên ChatChunk)
- ✅ Genres/Tags lấy từ `getCachedGenres()` / `getCachedTags()` trong `src/lib/cache.ts`
- ✅ View count increment dùng `after()` (non-blocking)

### 9.2 Cache Invalidation

```typescript
import { revalidateTag } from 'next/cache'
revalidateTag('genres')         // sau khi sửa genre
revalidateTag('tags')           // sau khi thêm/xóa tag
revalidateTag('author-profile') // sau khi sửa hồ sơ tác giả
```

### 9.3 ISR/Caching

- **KHÔNG** đặt `force-dynamic` ở root `layout.tsx`
- Trang có searchParams → `force-dynamic`
- Trang tĩnh → `revalidate = N`

---

## 10. SEO & Sharing

### 10.1 URL Structure

```
/                                    # Homepage (feed + search)
/gioi-thieu                          # About author
/tac-pham                            # All works (filters + search)
/tac-pham/[slug]                     # Work detail
/the-loai/[genre]                    # Genre filter
/tag/[slug]                          # Tag filter
/bo-suu-tap/[slug]                   # Collection
/sach                                # Books list
/sach/[slug]                         # Book detail
/tim-kiem                            # AI search (Thủ Thư AI)
/cms/...                             # CMS admin
```

### 10.2 Meta & Open Graph

- `<title>` riêng: `{Tiêu đề} - Nguyễn Thế Hoàng Linh`
- `og:title`, `og:description`, `og:image`
- `twitter:card: summary_large_image`
- Sitemap XML, RSS Feed, Canonical URL
- Structured Data (JSON-LD) cho Article

---

## 11. Danh Sách File Quan Trọng

| File | Vai trò |
|---|---|
| `src/lib/cache.ts` | Centralized cache cho genres/tags/author/books/collections |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/auth.ts` | NextAuth JWT config |
| `src/lib/chunkAndEmbed.ts` | Auto chunk + embed khi thêm/sửa work qua CMS |
| `src/app/api/ai-search/route.ts` | Hybrid vector+text search API |
| `src/components/public/WorksSmartSearch.tsx` | Smart search tích hợp trong list |
| `src/components/public/AILibrarian.tsx` | Trang Thủ Thư AI (sẽ thay bằng chat) |
| `src/app/(public)/layout.tsx` | 3-column layout: sidebar / feed / collections |
| `prisma/schema.prisma` | Database schema |

### Scripts (chạy thủ công khi import batch)

| File | Vai trò |
|---|---|
| `scripts/build-data.py` | Parse Facebook JSON → works.json + chunks.json |
| `scripts/generate_embeddings.py` | Tạo vector embeddings cho chunks (~$0.01/1000 chunks) |
| `scripts/seed_db.py` | Import works + chunks vào DB (có checkpoint, skip duplicate) |

### Skills

| Skill | Mô tả |
|---|---|
| `.agents/skills/import-works/SKILL.md` | Hướng dẫn import batch tác phẩm từ JSON |
| `.agents/skills/deploy-to-server/SKILL.md` | Deploy Docker image + DB dump + media lên DigitalOcean VPS |

### Scripts tiện ích (maintenance)

| File | Vai trò |
|---|---|
| `scripts/health-check.js` | Kiểm tra env/DB/OpenAI trước khi deploy |
| `scripts/check-genres.js` | Kiểm tra genre counts vs total works |
| `scripts/update-admin-password.ts` | Reset mật khẩu admin |
| `scripts/server-deploy.sh` | Script deploy lên server (configurable version) |
| `scripts/deploy-init.sh` | Khởi tạo DB lần đầu trên server |

---

## 12. Kế Hoạch Tương Lai

| Feature | Mô tả | Trạng thái |
|---|---|---|
| AI Chat | Thay `/tim-kiem` bằng chat conversational với AI | Chưa có spec |
| Newsletter | Email subscription cho độc giả | Chưa bắt đầu |
| Analytics | Dashboard thống kê nâng cao | Chưa bắt đầu |
| Multi-language | Hỗ trợ EN/VN | Chưa bắt đầu |
