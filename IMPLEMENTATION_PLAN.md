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
- [ ] Định nghĩa enum `Genre`: `poem | novel | essay | prose | painting | photo | video`
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

### 8.1 Performance
- [ ] Dùng `next/image` cho tất cả ảnh (lazy loading, responsive sizes)
- [ ] Static Generation (SSG/ISR) cho các trang public phổ biến
  - [ ] Homepage: ISR revalidate 3600s (1h)
  - [ ] Work detail: `generateStaticParams` cho tất cả published works
  - [ ] Genre, Tag, Collection pages: ISR
- [ ] Pagination với `Suspense` để tránh blocking
- [ ] Font optimization: `next/font/google`

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
