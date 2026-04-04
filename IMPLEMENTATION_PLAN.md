# IMPLEMENTATION_PLAN.md
# Kế Hoạch Triển Khai: Web App Thư Viện Tác Phẩm Nguyễn Thế Hoàng Linh

> Dựa trên PRD trong `CLAUDE.md`  
> Tech stack: Next.js 14+ (App Router) + TypeScript + Prisma + PostgreSQL + Tailwind CSS

---

## Phase 0: Setup & Khởi Tạo Dự Án

### 0.1 Khởi tạo Next.js
- [ ] Chạy `npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir`
- [ ] Cài thêm dependencies cốt lõi:
  - `prisma @prisma/client`
  - `next-auth @auth/prisma-adapter`
  - `@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-hard-break`
  - `uploadthing @uploadthing/react` (hoặc `cloudinary`)
  - `next-sitemap`
  - `date-fns`
  - `slugify`
  - `bcryptjs @types/bcryptjs`
  - `zod`
  - `react-hook-form @hookform/resolvers`
- [ ] Cài shadcn/ui: `npx shadcn@latest init`, thêm các components cần thiết

### 0.2 Cấu hình môi trường
- [ ] Tạo file `.env.local` và `.env.example` với các biến:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
  - `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID` (hoặc Cloudinary keys)
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (seed ban đầu)
- [ ] Cấu hình `next.config.ts` (image domains, etc.)
- [ ] Cấu hình `tsconfig.json` path aliases (`@/`)

### 0.3 Cấu trúc thư mục
- [ ] Tạo cấu trúc thư mục theo PRD:
  ```
  app/(public)/
  app/(cms)/
  app/api/
  components/public/
  components/cms/
  lib/
  prisma/
  ```
- [ ] Tạo các file layout: `app/(public)/layout.tsx`, `app/(cms)/layout.tsx`

---

## Phase 1: Database Schema & Prisma

### 1.1 Prisma Schema
- [ ] Tạo `prisma/schema.prisma` với đầy đủ các model:
  - `AdminUser` (email, passwordHash, createdAt, lastLoginAt)
  - `Work` (id, title, slug, genre, content, excerpt, coverImageUrl, media, status, publishedAt, scheduledAt, isFeatured, seoTitle, seoDescription, ogImageUrl, viewCount, createdAt, updatedAt, deletedAt)
  - `Tag` (id, name, slug)
  - `Collection` (id, title, slug, description, coverImage, order, createdAt)
  - `Media` (id, filename, url, type, size, width, height, altText, createdAt)
  - `WorkTag` (workId, tagId) — junction table
  - `WorkCollection` (workId, collectionId) — junction table
  - `AuthorProfile` (singleton, có thể là JSON config hoặc table)
- [x] Định nghĩa enum `Genre`: `stt | poem | essay | short_story | novel | memoir | children | photo | video`
  > ⚠️ Genre `prose` đã được rename thành `stt` (Status) vào 2026-04-04. Xem Phase Genre Fix bên dưới.
- [ ] Định nghĩa enum `WorkStatus`: `draft | published | scheduled`
- [ ] Định nghĩa enum `MediaType`: `image | video | pdf`
- [ ] Tạo indexes: `Work.slug (unique)`, `Work.status`, `Work.genre`, `Tag.slug (unique)`, `Collection.slug (unique)`

### 1.2 Migration & Seed
- [ ] Chạy `npx prisma migrate dev --name init`
- [ ] Tạo `prisma/seed.ts`: tạo admin user mặc định
- [ ] Chạy `npx prisma db seed`
- [ ] Tạo script `scripts/bulk-import.ts` để import tác phẩm từ JSON/CSV
  - [ ] Đọc file JSON: `[{title, content, genre, tags, publishedAt, ...}]`
  - [ ] Tự động tạo slug từ title (slugify + unaccent tiếng Việt)
  - [ ] Xử lý duplicate slug
  - [ ] Chạy: `npx ts-node scripts/bulk-import.ts ./data/works.json`

---

## Phase 2: Authentication (CMS)

### 2.1 NextAuth Setup
- [ ] Tạo `lib/auth.ts` với NextAuth config (Credentials provider)
  - [ ] Verify email + bcrypt password
  - [ ] Session strategy: JWT
  - [ ] Callbacks: session, jwt
- [ ] Tạo route `app/api/auth/[...nextauth]/route.ts`
- [ ] Tạo middleware `middleware.ts` để protect tất cả routes `/cms/**` (redirect về `/cms/login` nếu chưa auth)

### 2.2 Login Page
- [ ] Tạo `app/(cms)/login/page.tsx`
  - [ ] Form: Email + Password (react-hook-form + zod validation)
  - [ ] Call `signIn('credentials', {...})`
  - [ ] Hiển thị lỗi nếu sai thông tin
  - [ ] Remember me (session duration)
- [ ] Style: đơn giản, tối giản, phù hợp brand

### 2.3 Đổi mật khẩu
- [ ] Tạo `app/(cms)/cai-dat/page.tsx` với form đổi mật khẩu
  - [ ] Validate mật khẩu cũ trước khi cho đổi
  - [ ] Hash mật khẩu mới với bcrypt

---

## Phase 3: CMS — Quản Lý Tác Phẩm

### 3.1 Layout CMS & Dashboard
- [ ] Tạo `app/(cms)/layout.tsx` với sidebar navigation
  - [ ] Menu: Dashboard, Tác phẩm, Bộ sưu tập, Tag, Media, Cài đặt
  - [ ] User avatar + logout button
- [ ] Tạo `app/(cms)/dashboard/page.tsx`
  - [ ] Stats cards: Tổng tác phẩm, Đã xuất bản, Draft, Tổng view
  - [ ] Danh sách 5 tác phẩm mới nhất
  - [ ] Quick actions: "Tạo tác phẩm mới"

### 3.2 API Routes — Works
- [ ] `GET /api/works` — Danh sách (filter: status, genre, tag, search; sort; paginate)
- [ ] `POST /api/works` — Tạo mới
- [ ] `GET /api/works/[id]` — Chi tiết
- [ ] `PUT /api/works/[id]` — Cập nhật
- [ ] `DELETE /api/works/[id]` — Soft delete (set deletedAt)
- [ ] `POST /api/works/[id]/publish` — Publish ngay
- [ ] `POST /api/works/[id]/unpublish` — Về draft
- [ ] `POST /api/works/[id]/duplicate` — Nhân bản
- [ ] Tất cả routes cần auth check (server-side với `getServerSession`)
- [ ] Validate input với Zod schema

### 3.3 Rich Text Editor Component
- [ ] Tạo `components/cms/WorkEditor.tsx` dùng TipTap
  - [ ] Extensions: StarterKit, HardBreak, Link, Image, Placeholder
  - [ ] Custom CSS để preserve line breaks cho thơ
  - [ ] Toolbar: Bold, Italic, Link, Heading, BulletList, OrderedList, HorizontalRule, Undo/Redo
  - [ ] Toggle "Poetry Mode" (có thể bật `white-space: pre-wrap` cho toàn bộ content)
  - [ ] Merge với markdown input option (optional)

### 3.4 Trang Tạo/Sửa Tác Phẩm
- [ ] Tạo `app/(cms)/tac-pham/them-moi/page.tsx`
- [ ] Tạo `app/(cms)/tac-pham/[id]/page.tsx`
- [ ] Form fields:
  - [ ] **Tiêu đề:** TextInput (required)
  - [ ] **Slug:** TextInput (auto-generate từ title, editable; check unique)
  - [ ] **Thể loại (Genre):** Select dropdown
  - [ ] **Nội dung:** TipTap editor (WorkEditor component)
  - [ ] **Trích đoạn:** Textarea (auto-fill từ content nếu để trống)
  - [ ] **Ảnh bìa:** Upload component (hiển thị preview)
  - [ ] **Tag:** Multi-select với combobox (tạo mới tag ngay trong form)
  - [ ] **Bộ sưu tập:** Multi-select
  - [ ] **Trạng thái:** Radio: Draft / Published / Scheduled
  - [ ] **Ngày xuất bản:** DatePicker (khi chọn Scheduled)
  - [ ] **Ghim trang chủ:** Checkbox (isFeatured)
  - [ ] **SEO:** Accordion mở rộng — seo_title, seo_description, og_image
- [ ] Auto-save (debounce 3 giây, save to draft)
- [ ] Nút Preview (mở tab mới với preview URL)
- [ ] Nút "Lưu Draft" và "Xuất bản"

### 3.5 Danh Sách Tác Phẩm
- [ ] Tạo `app/(cms)/tac-pham/page.tsx`
  - [ ] Bảng danh sách với columns: Tiêu đề, Thể loại, Trạng thái, Ngày tạo, Actions
  - [ ] Filter: status, genre, search by title
  - [ ] Sort: mới nhất, cũ nhất
  - [ ] Pagination (20 items/page)
  - [ ] Actions per row: Sửa, Preview, Duplicate, Xóa
  - [ ] Bulk actions: Xóa nhiều, Publish nhiều

---

## Phase 4: CMS — Tag, Collection, Media

### 4.1 API Routes — Tags
- [ ] `GET /api/tags` — Danh sách
- [ ] `POST /api/tags` — Tạo mới
- [ ] `PUT /api/tags/[id]` — Cập nhật (name, slug)
- [ ] `DELETE /api/tags/[id]` — Xóa (không xóa nếu còn works dùng)

### 4.2 Tag Management Page
- [ ] Tạo `app/(cms)/tag/page.tsx`
  - [ ] Bảng: Tên, Slug, Số tác phẩm, Actions
  - [ ] Form tạo/sửa tag (inline hoặc modal)

### 4.3 API Routes — Collections
- [ ] `GET /api/collections` — Danh sách
- [ ] `POST /api/collections` — Tạo mới
- [ ] `PUT /api/collections/[id]` — Cập nhật
- [ ] `DELETE /api/collections/[id]` — Xóa
- [ ] `PUT /api/collections/reorder` — Kéo thả để sắp xếp thứ tự

### 4.4 Collection Management Page
- [ ] Tạo `app/(cms)/bo-suu-tap/page.tsx`
  - [ ] Danh sách bộ sưu tập với ảnh bìa, mô tả, số tác phẩm
  - [ ] Tạo/Sửa bộ sưu tập (form: title, slug, description, cover image)

### 4.5 Media Upload & Library
- [ ] Setup Uploadthing (hoặc Cloudinary):
  - [ ] Tạo `app/api/uploadthing/route.ts` (hoặc Cloudinary config)
  - [ ] Upload endpoint: nhận file, lưu vào cloud, lưu metadata vào DB
- [ ] `GET /api/media` — Danh sách media (filter: type, search)
- [ ] `DELETE /api/media/[id]` — Xóa (xóa cả file trên cloud)
- [ ] Tạo `app/(cms)/media/page.tsx` — Media Library
  - [ ] Grid view ảnh/video
  - [ ] Upload mới (drag & drop, multi-file)
  - [ ] Filter theo type
  - [ ] Click để copy URL
  - [ ] Xóa media

---

## Phase 5: Public Site

### 5.1 Layout & Design System
- [ ] Tạo `app/(public)/layout.tsx`
  - [ ] Header: Logo/tên tác giả, navigation (Trang chủ, Tác phẩm, Giới thiệu, Tìm kiếm)
  - [ ] Footer: Copyright, links mạng xã hội, RSS link
- [ ] Thiết lập CSS design tokens trong `app/globals.css`:
  - [ ] Color palette: warm neutrals (cream/off-white background, near-black text)
  - [ ] Typography scale: heading (Playfair Display), body (Lora hoặc Merriweather), UI (Inter)
  - [ ] Import Google Fonts
  - [ ] Reading mode styles: max-width 680px, line-height 1.8, generous padding

### 5.2 Trang Chủ (Homepage)
- [ ] Tạo `app/(public)/page.tsx`
- [ ] Section: **Hero** — tên tác giả, quote ngắn/tagline, ảnh
- [ ] Section: **Tác phẩm nổi bật** — lấy works có `isFeatured=true` (max 6)
- [ ] Section: **Mới nhất** — 6 tác phẩm published gần nhất
- [ ] Section: **Thể loại** — 7 thẻ thể loại với icon/emoji
- [ ] Section: **Bộ sưu tập** — Danh sách collections

### 5.3 API Public Endpoints
- [ ] `GET /api/public/works` — Danh sách published (filter, sort, paginate, search)
- [ ] `GET /api/public/works/[slug]` — Chi tiết tác phẩm (cộng thêm view count)
- [ ] `GET /api/public/tags` — Tất cả tags kèm số lượng tác phẩm
- [ ] `GET /api/public/collections` — Tất cả collections
- [ ] `GET /api/public/collections/[slug]` — Chi tiết collection + works
- [ ] `GET /api/public/works/related?workId=&limit=4` — Tác phẩm liên quan

### 5.4 Trang Giới Thiệu (About)
- [ ] Tạo `app/(public)/gioi-thieu/page.tsx`
  - [ ] Ảnh lớn của tác giả
  - [ ] Tiểu sử đầy đủ (rich text từ AuthorProfile)
  - [ ] Timeline giải thưởng / ấn phẩm
  - [ ] Links mạng xã hội

### 5.5 Danh Sách Tác Phẩm (Archive)
- [ ] Tạo `app/(public)/tac-pham/page.tsx`
  - [ ] Grid/list works với ảnh bìa, title, excerpt ngắn, genre badge
  - [ ] Sidebar filter: Thể loại, Tag, Bộ sưu tập, Năm
  - [ ] Sort: Mới nhất, Cũ nhất
  - [ ] Pagination (load more hoặc numbered pages)
  - [ ] URL params: `/tac-pham?genre=poem&tag=tinh-yeu&page=2`

### 5.6 Trang Chi Tiết Tác Phẩm
- [ ] Tạo `app/(public)/tac-pham/[slug]/page.tsx`
  - [ ] Ảnh bìa (hero image) nếu có
  - [ ] Tiêu đề, genre badge, ngày đăng
  - [ ] Nội dung tác phẩm (render với poetry formatting nếu genre=poem)
    - [ ] `white-space: pre-wrap` cho genre `poem`
    - [ ] Prose rendering cho các thể loại khác
  - [ ] Tag list (clickable)
  - [ ] Bộ sưu tập (nếu thuộc bộ sưu tập)
  - [ ] Share buttons: Facebook, Twitter, Copy Link
  - [ ] Điều hướng: Bài trước / Bài tiếp (cùng genre)
  - [ ] Section "Tác phẩm liên quan" (4 bài cùng genre/tag)
- [ ] Tăng viewCount mỗi lần load (debounce hoặc server action)
- [ ] Tạo `generateMetadata()` cho SEO động (title, description, OG tags)

### 5.7 Trang Thể Loại
- [ ] Tạo `app/(public)/the-loai/[genre]/page.tsx`
  - [ ] Hiển thị danh sách works theo genre
  - [ ] Tiêu đề trang theo genre (Thơ, Tiểu thuyết, Tùy bút, ...)
  - [ ] SEO metadata
  - [ ] Pagination

### 5.8 Trang Tag
- [ ] Tạo `app/(public)/tag/[slug]/page.tsx`
  - [ ] Danh sách works có tag đó
  - [ ] SEO metadata

### 5.9 Trang Bộ Sưu Tập
- [ ] Tạo `app/(public)/bo-suu-tap/page.tsx` — Danh sách tất cả collections
- [ ] Tạo `app/(public)/bo-suu-tap/[slug]/page.tsx`
  - [ ] Ảnh bìa collection, mô tả
  - [ ] Danh sách works trong collection (ordered)
  - [ ] SEO metadata

### 5.10 Trang Tìm Kiếm
- [ ] Tạo `app/(public)/tim-kiem/page.tsx`
  - [ ] Search box (URL param `?q=`)
  - [ ] Kết quả: PostgreSQL full-text search trên title + content + tags
  - [ ] Gợi ý tìm kiếm (debounce, API autocomplete)
  - [ ] Highlight từ khóa trong kết quả
  - [ ] "Không tìm thấy" state với gợi ý

---

## Phase 6: SEO & Technical

### 6.1 Metadata API
- [ ] Tạo `app/(public)/layout.tsx` với default metadata
- [ ] Override metadata cho mỗi trang (generateMetadata)
  - [ ] Homepage, About, Archive, Genre, Tag, Collection, Search
  - [ ] Work detail: title, description, OG image = cover image

### 6.2 Sitemap & RSS
- [ ] Cấu hình `next-sitemap.config.js`
  - [ ] Include: tất cả published works, genres, tags, collections
  - [ ] changefreq, priority phù hợp
  - [ ] Chạy: `next-sitemap` sau build
- [ ] Tạo `app/rss.xml/route.ts` — RSS Feed với 50 bài mới nhất
- [ ] Tạo `app/robots.txt/route.ts`

### 6.3 Structured Data (JSON-LD)
- [ ] Tạo component `JsonLd` chung
- [ ] Article schema cho trang chi tiết tác phẩm
- [ ] BreadcrumbList schema
- [ ] Person schema cho tác giả

### 6.4 Open Graph Image
- [ ] Dynamic OG image dùng `next/og` (ImageResponse)
  - [ ] Template: tên bài + tên tác giả + ảnh nền nhẹ
  - [ ] Route: `app/api/og/route.ts?title=...`

---

## Phase 7: Author Profile CMS

### 7.1 Cài đặt tác giả
- [ ] Tạo `app/(cms)/cai-dat/page.tsx` — Settings page
  - [ ] Chỉnh sửa thông tin tác giả (bio, tiểu sử ngắn)
  - [ ] Upload ảnh đại diện, ảnh cover
  - [ ] Quản lý links mạng xã hội
  - [ ] Quản lý danh sách giải thưởng / ấn phẩm (JSON editor hoặc form thêm/xóa)
- [ ] `GET/PUT /api/author` endpoint (cần admin auth)

---

## Phase 8: Performance & Polish

### 8.1 Performance — ĐÃ HOÀN THÀNH (2026-02-28)

> Tối ưu cho quy mô 10.000 tác phẩm, content ~3-4GB text, 10k lượt xem/tháng

**Database Indexes (đã apply vào DB):**
- [x] `@@index([status, deletedAt, publishedAt])` — trang chủ + danh sách
- [x] `@@index([genre, status, deletedAt])` — filter theo thể loại
- [x] `@@index([featuredDate, status, deletedAt])` — tác phẩm ngày
- [x] `@@index([createdAt])` — CMS dashboard
- [x] `@@index([deletedAt, status])` — COUNT/groupBy queries
- [x] GIN index `Work_fts_gin_idx` — Full-text search (tsvector), thay thế LIKE scan

**Next.js & Caching:**
- [x] Xóa `force-dynamic` khỏi root layout → bật lại ISR/SSG
- [x] `next.config.ts`: `compress: true` + `images` (WebP/AVIF, 30-day TTL)
- [x] `src/lib/cache.ts`: `getCachedGenres`, `getCachedTags`, `getCachedAuthorProfile` (unstable_cache)
- [x] Homepage ISR `revalidate = 300` (5 phút)
- [x] About page ISR `revalidate = 86400` (24h)
- [x] `after()` từ `next/server` cho view count (non-blocking)

**Query Optimization:**
- [x] **KHÔNG BAO GIỜ** select `content` trong list views (excerpt thay thế)
- [x] Dashboard: 3 COUNT riêng lẻ → 1 `groupBy`
- [x] Tag page: thêm `take: 60`, parallel query, chỉ select cần thiết
- [x] Collection page: filter trong DB thay vì JavaScript
- [x] Related works: `select` thay `include` toàn bộ
- [x] Search (`/tim-kiem`): PostgreSQL full-text search thay LIKE

**⚠️ Known Issue — `/tac-pham` search filter:**
- ~~Trang `/tac-pham?search=...` dùng `contains` (LIKE) trên `content`~~ → **ĐÃ FIX**: Chuyển sang `WorksSmartSearch` component (hybrid vector + FTS)
- ~~Với 10k tác phẩm × 3-4GB content, cần chuyển sang FTS khi có nhiều traffic~~ → **DONE**
- Workaround: Redirect search về `/tim-kiem?q=...` thay vì filter inline

**Còn lại:**
- [ ] Dùng `next/image` thay `<img>` cho tất cả ảnh (đã làm homepage, còn các trang khác)
- [ ] `generateStaticParams` cho Work detail pages (nếu muốn SSG)
- [ ] Font optimization: `next/font/google`
- [ ] Pagination với `Suspense`

### 8.2 UI Polish
- [ ] Kiểm tra responsive trên mobile (375px, 390px), tablet (768px), desktop (1280px)
- [ ] Dark mode toggle (optional, low priority)
- [ ] Loading states / skeletons cho tất cả async operations
- [ ] Error boundaries
- [ ] 404 page đẹp
- [ ] Empty states (khi không có tác phẩm)

### 8.3 Accessibility
- [ ] Alt text cho tất cả ảnh (từ media library)
- [ ] Keyboard navigation cho menu, forms
- [ ] ARIA labels cho buttons không có text
- [ ] Color contrast check (WCAG AA)
- [ ] Focus visible styles

---

## Phase 9: Testing & QA

### 9.1 Testing thủ công (Checklist)
- [ ] **Auth flow:** Đăng nhập đúng/sai, logout, session hết hạn
- [ ] **CRUD tác phẩm:** Tạo, sửa, xóa, duplicate, change status
- [ ] **Auto-save:** Kiểm tra draft được lưu khi đang gõ
- [ ] **Slug:** Unique validation, Vietnamese unaccent
- [ ] **Upload:** Ảnh, video; kiểm tra size limit
- [ ] **Public site:** Homepage, listing, filter, search, detail page
- [ ] **SEO:** View source kiểm tra meta tags, OG tags
- [ ] **Chia sẻ:** Test share link Facebook (dùng Facebook Debugger)
- [ ] **Responsive:** Test trên mobile thật hoặc DevTools
- [ ] **Bulk import:** Chạy script import với file JSON mẫu

### 9.2 Performance Testing
- [ ] Chạy Lighthouse audit: mục tiêu Performance > 90
- [ ] Kiểm tra Core Web Vitals (LCP, CLS, FID)
- [ ] Test tốc độ tải trang với 1.000 tác phẩm trong DB

---

## Phase 10: Deployment

### 10.1 Chuẩn bị
- [ ] Set up PostgreSQL database (Neon.tech, Supabase, hoặc Railway — free tier OK)
- [ ] Set up Cloudinary hoặc Uploadthing account
- [ ] Đăng ký tên miền (ví dụ: `nguyenthehoanglinh.vn`)
- [ ] Set tất cả env vars cho production

### 10.2 Deploy lên Vercel
- [ ] Push code lên GitHub
- [ ] Connect GitHub repo với Vercel
- [ ] Set environment variables trong Vercel dashboard
- [ ] Chạy `prisma migrate deploy` (production migration)
- [ ] Seed admin user
- [ ] Custom domain setup + HTTPS (tự động qua Vercel)

### 10.3 Post-deployment
- [ ] Chạy script bulk import tác phẩm (~1.000 bài)
- [ ] Kiểm tra sitemap: `yourdomain.com/sitemap.xml`
- [ ] Kiểm tra robots.txt: `yourdomain.com/robots.txt`
- [ ] Submit sitemap lên Google Search Console
- [ ] Test Open Graph: `https://developers.facebook.com/tools/debug/`
- [ ] Setup monitoring (Vercel Analytics hoặc Plausible)
- [ ] Backup cron job cho database

---

## Phụ Lục: Cấu Trúc File JSON Bulk Import

```json
[
  {
    "title": "Giá mà được chết đi một lúc",
    "slug": "gia-ma-duoc-chet-di-mot-luc",
    "genre": "poem",
    "content": "Giá mà được chết đi một lúc\nrồi sống lại\nnhư oản cúng",
    "excerpt": "Giá mà được chết đi một lúc...",
    "tags": ["tình yêu", "cuộc sống"],
    "collections": ["Ra vườn nhặt nắng"],
    "status": "published",
    "publishedAt": "2020-01-15T00:00:00Z",
    "coverImageUrl": null,
    "isFeatured": false
  }
]
```

---

## Phase Genre Fix — ĐÃ HOÀN THÀNH (2026-04-04)

> **Vấn đề**: Sidebar "Tất cả" hiện 23,921 nhưng tổng các category chỉ 13,617 → thiếu 10,304.
> **Nguyên nhân**: 10,304 works có `genre = "prose"` nhưng Genre table không có entry `prose`.

### Thay đổi đã thực hiện

- [x] Tạo genre mới `stt` (Status) trong Genre table — label: "Stt", emoji: 📄
- [x] Migrate 10,304 works: `genre = 'prose'` → `genre = 'stt'`
- [x] Xóa Genre entries trùng lặp: `Tản văn` (tiếng Việt), `Bút ký` (tiếng Việt)
- [x] Normalize 1 work orphan (`Tản văn` Unicode variant) → `essay`
- [x] Verify: SUM(genre counts) = 23,921 = Total works ✅
- [x] Deploy v5 lên production server (build + DB restore)

### Genre Table hiện tại (production)

| Order | Value | Label | Emoji | Works |
|-------|-------|-------|-------|-------|
| 0 | `stt` | Stt | 📄 | 10,304 |
| 1 | `poem` | Thơ | 📝 | 9,055 |
| 2 | `short_story` | Truyện ngắn | 📖 | 0 |
| 3 | `essay` | Tản văn | ✍️ | 3 |
| 4 | `novel` | Tiểu thuyết | 📚 | 0 |
| 5 | `memoir` | Bút ký | 🖊️ | 1 |
| 6 | `children` | Thơ thiếu nhi | 🧒 | 0 |
| 7 | `photo` | Ảnh | 📷 | 3,003 |
| 8 | `video` | Video | 🎬 | 1,555 |

> **Lưu ý**: Genre `prose` **không còn tồn tại** trong DB. Tất cả works cũ có genre `prose`
> đã được chuyển sang `stt`. Code import mới cần dùng `stt` thay vì `prose`.

---

## Notes & Quyết Định Kiến Trúc

| Vấn đề | Quyết định | Lý do |
|--------|-----------|-------|
| Rich text vs Markdown | TipTap (WYSIWYG) | Dễ hơn cho tác giả không kỹ thuật |
| File storage | Cloudinary | Free tier 25GB, transform tự động |
| Search | PG full-text search | Đơn giản, đủ dùng; thêm Meilisearch sau nếu cần |
| DB | PostgreSQL (Neon) | Free tier, serverless-friendly với Vercel |
| Auth | NextAuth v5 (beta) | Tích hợp tốt nhất với Next.js App Router |
| CSS | Tailwind CSS + shadcn/ui | Nhanh, nhất quán, customizable |
| Deploy | Vercel | Zero-config với Next.js, free tier đủ dùng |

---

*Kế hoạch này sẽ được cập nhật khi tiến hành code. Tick [x] khi hoàn thành từng mục.*

---
---

# PHASE DATA: Data Pipeline + Chatbot "Thơ Máy" + AI NTHL

> **Mục tiêu**: Xây nền tảng data sạch từ Facebook export → seed vào PostgreSQL → chatbot "thơ máy" (semantic search + random) → tác giả dạy AI qua CMS → AI personal hóa theo phong cách NTHL.
>
> **Nguồn dữ liệu**: `facebook-nguyenthehoanglinh-06_03_2026-y1cYzpJi/` (61.884 bài, 1.041 Notes, 4.247 comments)
> **Script hiện tại**: `export_to_docx.py` (đã có dedup, comment matching, encoding fix)

---

## DATA.1 — Dọn dữ liệu: Loại bỏ "shared a memory"

### Vấn đề
- Có ~19.000 bài "shared a memory" (sau dedup) → duplicate nội dung bài gốc
- Tác giả yêu cầu: **loại bỏ hoàn toàn**, log danh sách đã loại

### Thực hiện

#### [MODIFY] export_to_docx.py
- Thêm `filter_shares()` sau `dedup_posts()` trong `main()`
- Lọc ra tất cả bài có title chứa `"shared a memory"` hoặc `"shared a post"`
- Ghi danh sách bài đã loại ra `output/data/works_removed_shares.json`

#### [NEW] output/data/works_removed_shares.json
- Mỗi entry: `{timestamp, date, title, text_preview, original_date}`
- Mục đích: log để tác giả tra cứu nếu cần

### Thống kê ước tính

| Loại | Trước | Sau |
|------|-------|-----|
| Tổng bài (sau dedup) | 52.099 | ~20.000 |
| Shared a memory | ~19.000 | 0 |
| Shared other | ~6.000 | ~6.000 (giữ) |
| Bài gốc | ~20.000 | ~20.000 |

---

## DATA.2 — Phân loại tác phẩm (Rule-based)

### Rules phân loại

```python
def classify_work(text, title, has_media, media_type):
    lines = [l for l in text.split('\n') if l.strip()]
    avg_line_len = sum(len(l) for l in lines) / max(len(lines), 1)
    
    if media_type == 'video':
        if 'fifa' in text.lower() or 'fifa' in title.lower():
            return 'video_fifa'
        if 'chatgpt' in text.lower() or 'gpt' in text.lower():
            return 'video_chatgpt'
        return 'video'
    
    if has_media and media_type == 'image' and len(text) < 50:
        return 'photo'
    
    if len(lines) >= 4 and avg_line_len < 50:
        return 'poem'
        
    if len(text) > 300 and len(lines) < len(text) / 80:
        return 'stt'  # WAS 'prose', renamed 2026-04-04
     
    return 'stt'  # WAS 'status' → 'prose', renamed 2026-04-04
```

### Genre mapping (CẬP NHẬT 2026-04-04)

| Auto-classify | DB genre | Label sidebar | Emoji |
|--------------|---------|--------------|-------|
| `poem` | `poem` | Thơ | 📝 |
| `prose` / `status` | `stt` | Stt | 📄 |
| `video` / `video_fifa` / `video_chatgpt` | `video` | Video | 🎬 |
| `photo` | `photo` | Ảnh | 📷 |
| `essay` | `essay` | Tản văn | ✍️ |
| `memoir` | `memoir` | Bút ký | 🖊️ |

> ⚠️ **QUAN TRỌNG**: Genre `prose` đã bị xóa khỏi DB (2026-04-04). Code import mới phải dùng `stt`.
> Phân loại chỉ là gợi ý. Tác giả sửa qua CMS → DB cập nhật ngay.

---

## DATA.3 — Structured Data → JSON

#### [NEW] output/data/works.json
```json
{
  "id": "uuid", "title": "...", "slug": "...",
  "genre": "poem", "content": "...", "excerpt": "...",
  "status": "published", "publishedAt": "2017-10-06T00:00:00Z",
  "tags": ["auto:poem", "auto:2017"],
  "source": "facebook", "fbTimestamp": 1507276800,
  "autoClassified": true,
  "comments": [{"content": "...", "name": "...", "createdAt": "..."}]
}
```

#### [NEW] output/data/poems_only.json — Thư viện thơ riêng
#### [NEW] output/data/notes.json — 1.041 Notes đã clean HTML

---

## DATA.4 — Chunking cho Chatbot "Thơ Máy"

Tác giả muốn: **trả về 1-2 dòng nổi bật + link đến cả bài**

```python
def chunk_work(work):
    chunks = []
    lines = work['content'].split('\n')
    for i, line in enumerate(lines):
        line = line.strip()
        if len(line) < 10: continue
        if len(line) > 120:
            for s in re.split(r'[.!?]', line):
                if len(s.strip()) >= 10: chunks.append(s.strip())
        else:
            if i + 1 < len(lines) and len(line) < 60:
                next_line = lines[i+1].strip()
                if next_line and len(next_line) < 60:
                    chunks.append(f"{line}\n{next_line}")
                    continue
            chunks.append(line)
    return chunks
```

#### [NEW] output/data/chunks.json
Ước tính: ~20.000 bài × ~5 chunks/bài = **~100.000 chunks**

---

## DATA.5 — Vector Embeddings

- **Model**: OpenAI `text-embedding-3-large` (3072 dimensions, chất lượng tốt nhất)
- **Chi phí**: ~$1 cho 100K chunks (1 lần duy nhất)
- **Lưu trữ**: PostgreSQL `pgvector` extension

#### [NEW] scripts/generate_embeddings.py
```python
# Generate embeddings in batches of 100
for batch in batched(chunks, 100):
    response = openai.embeddings.create(
        model="text-embedding-3-large", input=[c['content'] for c in batch]
    )
    for chunk, emb in zip(batch, response.data):
        chunk['embedding'] = emb.embedding
```

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## DATA.6 — DB Schema mới

#### [MODIFY] prisma/schema.prisma

```prisma
// ── Chatbot "Thơ Máy" ──

model ChatChunk {
  id          String   @id @default(uuid())
  workId      String
  work        Work     @relation(fields: [workId], references: [id], onDelete: Cascade)
  content     String
  embedding   Unsupported("vector(3072)")?  // pgvector (text-embedding-3-large)
  score       Float    @default(0)
  isBlocked   Boolean  @default(false)
  createdAt   DateTime @default(now())
  feedbacks   ChatFeedback[]
  @@index([workId])
  @@index([isBlocked, score(sort: Desc)])
}

model ChatFeedback {
  id        String    @id @default(uuid())
  chunkId   String
  chunk     ChatChunk @relation(fields: [chunkId], references: [id], onDelete: Cascade)
  query     String
  rating    Int                           // +1 (👍) hoặc -1 (👎)
  isAuthor  Boolean   @default(false)     // weight ×3
  createdAt DateTime  @default(now())
  @@index([chunkId])
}

model AuthorInstruction {
  id          String   @id @default(uuid())
  type        String              // "correction" | "rule" | "reclassify"
  query       String?
  badChunkId  String?
  goodChunkId String?
  instruction String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

// ── AI Memory (tác giả dạy AI hiểu mình) ──

model AuthorMemory {
  id        String   @id @default(uuid())
  content   String              // "Tác giả thích giọng hài hước"
  category  String              // "style" | "preference" | "philosophy" | "rule"
  source    String              // "chat" | "feedback" | "manual"
  createdAt DateTime @default(now())
}

// Thêm relation vào Work:
// model Work { ... chunks ChatChunk[] }
```

---

## DATA.7 — Seed Script

#### [NEW] scripts/seed_db.py
```
1. Đọc output/data/works.json
2. Đọc output/data/chunks_with_embeddings.json
3. Kết nối PostgreSQL (localhost:5433, vibe_db)
4. INSERT works → Work table
5. INSERT chunks + embeddings → ChatChunk table
6. Tạo genres + tags auto (year, genre)
7. In thống kê
```

---

## DATA.8 — Media Catalog

#### [NEW] output/data/media_catalog.json
Nguồn: `media/` folder (2.302 ảnh + 381 video)

| Category | Cách phân loại |
|----------|---------------|
| Video Fifa | description chứa "Fifa" |
| Video ChatGPT | description chứa "GPT/ChatGPT" |
| Video khác | còn lại |
| Ảnh (chưa phân tranh/ảnh) | tác giả tag sau |

---

## DATA.9 — Cập nhật file Word

#### [MODIFY] export_to_docx.py
- `filter_shares()` → 15 file posts không còn "shared a memory"

#### [NEW] output/NTHL_Tho.docx
- Tách tất cả bài `genre=poem` thành file riêng

---

## DATA.10 — Chatbot API (3 tầng, bật tắt được)

#### [NEW] src/app/api/chat-poem/route.ts

```typescript
async function chatPoem(query: string) {
  // 0. Check AuthorInstruction rules
  const rule = await findMatchingRule(query)
  if (rule) return applyRule(rule)

  // 1. Tầng 1 (Free): pgvector cosine search
  const queryEmbedding = await getEmbedding(query)
  const results = await db.$queryRaw`
    SELECT c.*, w.title, w.slug,
           1 - (c.embedding <=> ${queryEmbedding}::vector) as similarity
    FROM "ChatChunk" c
    JOIN "Work" w ON c."workId" = w.id
    WHERE c."isBlocked" = false
    ORDER BY (similarity * 0.7 + c.score * 0.3) DESC
    LIMIT 10
  `
  // Random trong top 5 (tạo cảm giác "duyên")
  const chosen = results[Math.floor(Math.random() * Math.min(5, results.length))]

  // 2. Tầng 2 (Optional, $): GPT re-rank
  if (process.env.CHAT_TIER === '2') {
    chosen = await gptRerank(query, results)
  }

  return chosen
}
```

Config: `CHAT_TIER=1` (free) hoặc `CHAT_TIER=2` (GPT, ~$0.005/query)

---

## DATA.11 — CMS: Trang "Dạy Thơ Máy"

#### [NEW] src/app/(cms)/day-tho-may/page.tsx

```
┌─────────────────────────────────────────────┐
│  🎓 Dạy Thơ Máy                             │
│                                             │
│  [📋 Tầng 1: Form (Free)] [🤖 Tầng 2: AI ($)]│
│                                             │
│  Thử chat: [_______________] [Gửi]         │
│                                             │
│  Kết quả: "Mưa rơi trên mái nhà..."        │
│  [👍 +3] [👎 -3] [✏️ Sửa] [🚫 Block]       │
│                                             │
│  ── Tầng 1: Form (SQL thuần, $0) ──         │
│  • Dropdown sửa kết quả                     │
│  • Dropdown đổi thể loại                    │
│  • Thêm/xóa quy tắc                        │
│                                             │
│  ── Tầng 2: AI Chat (GPT, ~$0.005/msg) ──  │
│  Gõ tự nhiên → GPT parse → xác nhận → lưu  │
│  [Toggle ON/OFF] Chi phí: $0.015            │
│                                             │
│  📊 Thống kê | 📋 Lịch sử | 📏 Quy tắc     │
└─────────────────────────────────────────────┘
```

**Tầng 1 (Form)**: Tác giả dùng dropdown/form → code INSERT vào DB → $0
**Tầng 2 (AI)**: Tác giả gõ tự do → GPT parse thành actions → hiển thị xác nhận → tác giả approve → INSERT vào DB → ~$0.005/msg

---

## DATA.12 — AI Personalization: "AI NTHL"

### 12.1 Kiến trúc 3 lớp

```
Lớp 1: RETRIEVAL — pgvector + 20K works + 100K chunks
  → "Tìm đúng tác phẩm của NTHL"

Lớp 2: MEMORY — AuthorMemory DB + conversation history
  → "Nhớ tác giả thích gì, ghét gì, triết lý gì"

Lớp 3: PERSONALITY — Fine-tuned GPT trên kho tác phẩm
  → "Viết, nghĩ, phản ứng như NTHL"
```

### 12.2 Stack tối ưu

| Thành phần | Lựa chọn | Lý do |
|-----------|---------|-------|
| Framework | **Vercel AI SDK** | Native Next.js, streaming, tool calling |
| Chat model | **GPT-4o-mini** → **Fine-tuned GPT** | 4o-mini rẻ + tốt. Fine-tune khi đủ data |
| Embedding | **text-embedding-3-large** | Tốt hơn `small` ~10-15% |
| Vector DB | **pgvector** | Đã có PostgreSQL |
| Memory | **PostgreSQL AuthorMemory** | Toàn quyền kiểm soát |

### 12.3 Lộ trình cá nhân hóa

**Cấp 1 — Memory (ngay bây giờ, $0):**
```
Tác giả chat: "Anh thích giọng thơ hài hước, triết lý nhẹ nhàng"
  → Lưu AuthorMemory
  → System prompt tự cập nhật
  → AI trả lời phù hợp hơn ngay
```

**Cấp 2 — Fine-tune (khi đủ ~500 feedback, ~$10-50):**
```
Export: 20K bài + memories + feedbacks → training data JSONL
  → OpenAI Fine-tuning API (GPT-4o-mini)
  → Ra model: ft:gpt-4o-mini-NTHL
  → AI "viết giống NTHL" 95%
```

**Cấp 3 — AI NTHL toàn diện (tương lai):**
```
Fine-tuned model + Memory + RAG + Tools:
  • Trả thơ (semantic search)
  • Nối thơ (viết tiếp giống NTHL)
  • Đọc thơ (TTS)
  • Phân loại tác phẩm
  • Trả lời câu hỏi về tác giả
  • Nhớ mọi thứ tác giả dạy
```

### 12.4 Chi phí vận hành ước tính

| Hạng mục | Cấp 1 | Cấp 2 | Cấp 3 |
|---------|-------|-------|-------|
| Setup | $1 (embedding) | +$10-50 (fine-tune) | +$0 (code) |
| /tháng (1000 users) | $0.50 | $5-15 | $10-20 |

---

## DATA.13 — Thứ tự thực hiện

| Bước | Công việc | Phụ thuộc |
|------|----------|-----------|
| 1 | `filter_shares()` + log bài đã loại | - |
| 2 | `classify_work()` rule-based | Bước 1 |
| 3 | Tạo `works.json` + `poems_only.json` + `notes.json` | Bước 2 |
| 4 | `chunk_work()` → `chunks.json` | Bước 3 |
| 5 | Tạo `media_catalog.json` | - (song song) |
| 6 | Cập nhật 15 file Word (không share) + tạo `NTHL_Tho.docx` | Bước 2 |
| 7 | Update Prisma schema (+ChatChunk, ChatFeedback, AuthorInstruction, AuthorMemory) | - |
| 8 | `prisma migrate dev` + install pgvector | Bước 7 |
| 9 | `seed_db.py` — import works + chunks | Bước 3, 4, 8 |
| 10 | `generate_embeddings.py` — vectors | Bước 4, cần OPENAI_API_KEY |
| 11 | Insert embeddings vào DB | Bước 10 |
| 12 | API `/api/chat-poem` | Bước 8, 11 |
| 13 | Frontend "Thơ Máy" widget + 👍👎 | Bước 12 |
| 14 | CMS "Dạy Thơ Máy" (Tầng 1 Form + Tầng 2 AI) | Bước 12 |

> **Bước 1-6** chạy ngay (data pipeline, không cần web app).
> **Bước 7-14** cần web app + PostgreSQL chạy trên Mac.
> **Bước 10** cần `OPENAI_API_KEY` trong `.env`.

---

## DATA.14 — Thiết kế mở rộng (tương lai)

| Tính năng | Cần thêm |
|-----------|---------|
| **Nối thơ** (AI viết tiếp giống NTHL) | Fine-tuned GPT + few-shot examples |
| **Robot đọc thơ** (TTS) | OpenAI TTS / ElevenLabs API |
| **Trò chơi thơ** (quiz, ghép câu) | Game logic + UI, data sẵn trong chunks |
| **Fine-tune GPT-4o-mini** | 500+ feedbacks → JSONL → OpenAI API |
| **Tăng độ nét media** | Real-ESRGAN script |
| **Bán premium** | Stripe subscription |
| **Multi-agent content** | Orchestrator + specialist agents |

