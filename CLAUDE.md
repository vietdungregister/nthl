# CLAUDE.md — Product Requirements Document
# Web App Thư Viện Tác Phẩm: Nguyễn Thế Hoàng Linh

> **Phiên bản:** 1.0  
> **Ngày tạo:** 2026-02-26  
> **Loại sản phẩm:** CMS + Public Site (Literary Archive & Personal Branding)

---

## 1. Tổng Quan Sản Phẩm

### 1.1 Giới Thiệu

Đây là một web app "thư viện chính chủ" dành riêng cho nhà thơ **Nguyễn Thế Hoàng Linh** (sinh năm 1982 tại Hà Nội) — tác giả của hơn 1.000 tác phẩm bao gồm thơ, tiểu thuyết, tùy bút, tiểu luận, tranh, ảnh và video.

Hệ thống gồm hai phần gắn kết:
- **CMS (private):** Tác giả quản lý toàn bộ kho tác phẩm — tạo, sửa, xóa, phân loại, xuất bản.
- **Public Site (public):** Độc giả duyệt, đọc, tìm kiếm và chia sẻ tác phẩm.

### 1.2 Mục Tiêu Cốt Lõi

1. **Lưu trữ tập trung:** Thay thế việc đăng tác phẩm rải rác trên mạng xã hội bằng một kho tư liệu bền vững, do tác giả kiểm soát.
2. **Trải nghiệm đọc tốt:** Giao diện tối giản, typography đẹp, tập trung vào nội dung.
3. **Khả năng lan tỏa:** SEO tốt, slug đẹp, Open Graph, chia sẻ mạng xã hội dễ dàng.
4. **Thương hiệu cá nhân:** Phản ánh phong cách sáng tác — giản dị, chân thành, có chiều sâu.

---

## 1A. Hồ Sơ Tác Giả — Nguyễn Thế Hoàng Linh (Author Deep Profile)

> *Đây là phần quan trọng nhất định hướng toàn bộ sản phẩm — từ thiết kế, UX, đến cách tổ chức nội dung.*

### 1A.1 Tiểu Sử

| Thông tin | Chi tiết |
|-----------|---------|
| **Tên** | Nguyễn Thế Hoàng Linh |
| **Sinh** | 1982, Hà Nội |
| **Biệt danh** | "Thi tài tuổi 20" (giới phê bình đặt) |
| **Học vấn** | Đại học Ngoại thương Hà Nội — bỏ học năm 3 để chuyên tâm sáng tác |
| **Bắt đầu viết** | Từ năm 12 tuổi; đến năm 20 tuổi đã viết ~2.000 bài thơ |
| **Facebook** | [facebook.com/nguyenthehoanglinh](https://www.facebook.com/nguyenthehoanglinh) |
| **Thế hệ** | Đại diện tiêu biểu của thế hệ nhà văn trưởng thành cùng internet |

**Dấu mốc sự nghiệp:**
- Năm 2004: Tiểu thuyết *Chuyện của thiên tài* đoạt **Giải thưởng Hội Nhà văn Hà Nội**
- Năm 2005: Báo Tuổi Trẻ đăng "Cuộc trả lời phỏng vấn cuối cùng (?)" — dấu mốc truyền thông lớn
- Năm 2021: Bài thơ *Bắt nạt* được đưa vào **sách giáo khoa Ngữ văn lớp 6** (bộ "Kết nối tri thức với cuộc sống") — gây tranh luận lớn nhưng khẳng định tầm ảnh hưởng với thế hệ trẻ

### 1A.2 Toàn Bộ Tác Phẩm Đã Xuất Bản

#### Thơ (tập thơ xuất bản)

| Tập thơ | Năm | Ghi chú |
|---------|-----|---------|
| *Mầm sống* | — | Tập thơ đầu, lấy từ sáng tác trên diễn đàn mạng |
| *Uống một ngụm nước biển* | — | — |
| *Lẽ giản đơn* | 2006 | — |
| *Mỗi quốc gia là một thành phố của thế giới* | 2009 | — |
| *Hở* | 2011 | — |
| *Mật thư* | 2012 | — |
| *Em giấu gì ở trong lòng thế* | 2013 | **Đặc biệt:** toàn bộ nội dung in từ bản chép tay, không đánh máy |
| *Bé tập tô* | — | Thơ thiếu nhi |
| *Ra vườn nhặt nắng* | 2015 | Điểm sáng thơ thiếu nhi đương đại VN; chứa bài "Bắt nạt" (SGK lớp 6) |
| *Tôi Thức Tìm Cách Thức Để Ngủ* | — | — |

#### Tiểu thuyết

| Tác phẩm | Năm | Ghi chú |
|---------|-----|---------|
| *Chuyện của thiên tài* | 2004 | NXB Hội Nhà văn; Giải thưởng Hội Nhà văn Hà Nội 2004; mang âm hưởng nhật ký tự nhiên — thiên tài cũng chỉ là người thường bị cuốn vào những chuyện nhỏ nhặt |

#### Văn xuôi / Tùy bút / Tiểu luận

| Tác phẩm | Ghi chú |
|---------|---------|
| *Đọc kỹ hướng dẫn sử dụng trước khi dùng* | Văn xuôi phi hư cấu |
| *Văn chương động* | Tiểu luận về văn chương |
| *Live/Play [Sống/Chơi]* | Truyện/tùy bút |

#### Bài thơ nổi tiếng nhất (không thể thiếu trên site)

- *Giá mà được chết đi một lúc*
- *Lẽ giản đơn*
- *Giá tình yêu save được...*
- *Lặng im thì cũng vừa tàn mùa đông*
- *Cảm ơn*
- *Chuộc*
- *Mưa ngọt*
- *Giữa hai hàng cây*
- *Có những lúc...*
- *Hộp màu của Tạo Hoá*
- *Bắt nạt* (nổi tiếng nhất với công chúng rộng)
- *Ra vườn nhặt nắng* (tình cảm ông cháu, từng viral)

### 1A.3 Phong Cách Nghệ Thuật — Phân Tích Chuyên Sâu

#### Đặc trưng cốt lõi

**1. Giản dị đến mức cổ điển**
Ngôn ngữ anh dùng trong thơ cực kỳ đơn giản — không màu mè, không cầu kỳ từ ngữ. Đây là chủ ý chứ không phải thiếu năng lực. Anh từng ví thơ mình là "thứ thuốc thử cho những gì sặc sỡ xoắn vặn hình thức và câu chữ."

**2. Đùa cợt bề mặt — triết lý chiều sâu**
Nhiều bài thơ của anh đọc lên tưởng đùa, nhưng ẩn dưới là suy tư về sự cô đơn, tình yêu, lẽ sống, cái chết. Đây là nét độc đáo nhất tạo nên "Nguyễn Thế Hoàng Linh style."

**3. Phá vỡ cấu trúc thơ truyền thống**
Anh không tuân theo niêm luật, không gieo vần bắt buộc. Thơ anh đôi khi gần với văn xuôi hơn — ranh giới mờ nhạt, tự nhiên. Điều này đòi hỏi UI render thơ phải **preserve line breaks chính xác**.

**4. Hình ảnh gần gũi, đời thường**
Anh lấy cảm hứng từ những thứ bình thường nhất: ánh nắng, mưa, kẻ bắt nạt, cái chết giả, các vật dụng hàng ngày... Không có sự hoa mỹ, không có cảnh xa lạ.

**5. Chân thành đến mức phơi bày**
Đặc biệt trong mảng thơ tình (*Em giấu gì ở trong lòng thế*): cảm xúc trực tiếp, không che giấu, tạo cảm giác riêng tư như đọc nhật ký người khác. Tập thơ *Em giấu gì* thậm chí được in từ bản **chép tay** — thể hiện sự từ chối "khoảng cách" giữa tác giả và độc giả.

**6. Đa nhân cách cảm xúc**
Giới phê bình nhận xét dòng cảm xúc và tư duy liên tục, đa dạng trong tác phẩm có thể khiến người đọc cảm thấy anh là "người đa nhân cách" — hết hồn nhiên như trẻ thơ lại sâu sắc như triết nhân.

#### Tính cách online & cách hiện diện trên mạng

- Là đại diện của **thế hệ nhà văn internet đầu tiên** tại Việt Nam — nhiều bài thơ ban đầu đăng trên diễn đàn mạng rồi mới xuất bản thành sách.
- Phong cách đăng bài trên Facebook: **tự nhiên, không màu mè**, gần với cách anh viết thơ — không cần hào nhoáng marketing.
- Thơ anh lan truyền qua mạng xã hội rất mạnh, đặc biệt những bài ngắn, có thể đọc trong 1 phút.
- Có tầm ảnh hưởng lớn với **bạn trẻ 20-35 tuổi**, fan văn học.

### 1A.4 Hàm Ý Thiết Kế Trực Tiếp Từ Phong Cách Tác Giả

Đây là mapping trực tiếp từ đặc trưng nghệ thuật → quyết định thiết kế:

| Đặc trưng tác giả | → | Quyết định thiết kế |
|------------------|---|---------------------|
| Giản dị, không màu mè | → | Layout tối giản, nhiều khoảng trắng, không sidebar rối mắt khi đọc |
| Thơ không niêm luật, tự do | → | Bắt buộc preserve line breaks chính xác; không justify text |
| Chép tay, gần gũi | → | Font có nét nhân văn (Lora, Merriweather — serif nhẹ nhàng, không lạnh); có thể thêm texture giấy nhẹ |
| Đùa cợt / triết lý | → | UI không quá nghiêm túc; có thể có micro-copy thú vị trong empty states |
| Hồn nhiên (thơ thiếu nhi) ↔ Sâu sắc (thơ người lớn) | → | Phân biệt rõ genre bằng badge/màu nhẹ, không phô trương |
| Đời thường, bình thường | → | Không dùng hình ảnh stock fancy; ảnh thật của tác giả, ảnh tự nhiên |
| Lan truyền qua mạng XH | → | Share button nổi bật nhưng không lố; OG image chuẩn cho FB/Zalo |
| Internet generation | → | Site phải load nhanh; mobile-first vì fan đọc trên điện thoại là chính |
| Chân thành, phơi bày | → | About page phải thật — không viết theo kiểu "PR văn phòng" |

### 1A.5 Bộ Màu & Typography Được Suy Ra Từ Tác Giả

**Bảng màu gợi ý:**
```
Nền chính:    #FAFAF7  (trắng ngà — gần giấy)
Nền phụ:      #F2F0EB  (kem nhạt)  
Text chính:   #1A1A18  (gần đen, ấm hơn đen thuần)
Text phụ:     #6B6860  (xám ấm)
Accent:       #8B6F47  (nâu đất — gợi mực bút, giấy cũ)
Link:         #5C7A5C  (xanh lá nhạt, sage — gợi "vườn nhặt nắng")
Border:       #E5E2DC  (xám kem)
```

**Typography:**
- **Heading:** `Playfair Display` hoặc `Lora` (serif — uy tín, nhân văn, không lạnh)
- **Body / Thơ:** `Lora` (serif — đọc thoải mái, ấm)
- **UI / Navigation:** `Inter` hoặc `Be Vietnam Pro` (sans-serif sạch sẽ)
- **Line-height thơ:** 2.0+ (rộng rãi, mỗi dòng thơ cần không gian thở)
- **Max-width đọc:** 640-680px (không để dòng quá dài, mỏi mắt)

**Mood board (không ảnh thực):**
> Hình dung layout như một trang tạp chí văn học giấy đơn giản nhưng đẹp — nền kem, chữ đen, không quảng cáo, không ồn ào. Phong cách gần với các site như *The Paris Review* hoặc *Asymptote Journal* nhưng ấm hơn, Việt hơn.

---

## 2. Đối Tượng Sử Dụng

### 2.1 Tác Giả / Admin (1 người)

**Đặc điểm:**
- Không nhất thiết là chuyên gia kỹ thuật.
- Cần giao diện CMS đơn giản, thao tác nhanh.
- Có khoảng ~1.000 tác phẩm cần upload từ local.
- Thường xuyên thêm tác phẩm mới.

**Nhu cầu:**
- Đăng nhập bảo mật, phiên làm việc lâu dài.
- CRUD tác phẩm với rich text editor hỗ trợ thơ (preserve line breaks).
- Upload media (ảnh, video, file) từ máy tính.
- Phân loại tác phẩm: thể loại, tag, bộ sưu tập.
- Quản lý trạng thái: draft / published / scheduled.
- Preview trước khi publish.
- Import hàng loạt (bulk import cho 1.000 tác phẩm ban đầu).

### 2.2 Độc Giả (Public — không giới hạn)

**Đặc điểm:**
- Nhiều lứa tuổi, chủ yếu bạn trẻ yêu văn học.
- Truy cập qua di động nhiều hơn desktop.
- Đến từ Facebook, mạng xã hội, hoặc Google Search.

**Nhu cầu:**
- Duyệt tác phẩm theo thể loại, chủ đề.
- Tìm kiếm theo từ khóa, tên bài, trích đoạn.
- Đọc thoải mái (font đẹp, không quảng cáo, responsive).
- Chia sẻ link tác phẩm lên mạng xã hội.
- Xem tác phẩm liên quan / cùng bộ sưu tập.

---

## 3. Phạm Vi Chức Năng

### 3.1 CMS (Private — Tác Giả)

#### Auth
- [ ] Đăng nhập bằng email + password (single admin account)
- [ ] JWT/session authentication, remember me
- [ ] Đổi mật khẩu

#### Quản Lý Tác Phẩm (CRUD)
- [ ] Tạo tác phẩm mới với rich text editor (hỗ trợ poetry formatting — preserve line breaks, indent)
- [ ] Sửa tác phẩm
- [ ] Xóa tác phẩm (soft delete)
- [ ] Duplicate tác phẩm
- [ ] Preview tác phẩm trước khi publish
- [ ] Lưu draft tự động (auto-save)

#### Phân Loại
- [ ] **Thể loại (Genre):** Thơ, Tiểu thuyết, Tùy bút, Tiểu luận, Tranh, Ảnh, Video
- [ ] **Tag/Chủ đề:** tự do tạo, gợi ý từ tag có sẵn
- [ ] **Bộ sưu tập (Collection):** nhóm tác phẩm theo tập/series (ví dụ: "Ra vườn nhặt nắng", "Mật thư")

#### Trạng Thái Xuất Bản
- [ ] Draft (chỉ admin thấy)
- [ ] Published (công khai)
- [ ] Scheduled (lên lịch publish)

#### Media & Upload
- [ ] Upload ảnh/tranh (JPEG, PNG, WebP, GIF)
- [ ] Upload video (MP4, hoặc nhúng YouTube/Vimeo URL)
- [ ] Upload PDF (nếu cần)
- [ ] Thư viện media (media library) để tái sử dụng
- [ ] **Bulk import:** upload nhiều file cùng lúc, hoặc import từ file JSON/CSV

#### Dashboard
- [ ] Thống kê nhanh: tổng tác phẩm, đã publish, draft
- [ ] Danh sách tác phẩm có filter/search
- [ ] Sort theo ngày tạo, ngày sửa, thể loại

### 3.2 Public Site (Trang Công Khai)

#### Trang Chủ (Homepage)
- [ ] Giới thiệu ngắn về tác giả, ảnh đại diện
- [ ] Tác phẩm nổi bật / được ghim
- [ ] Tác phẩm mới nhất
- [ ] Link đến các thể loại chính

#### Trang Tác Giả (About)
- [ ] Tiểu sử đầy đủ
- [ ] Ảnh tác giả
- [ ] Danh sách xuất bản / giải thưởng
- [ ] Liên kết mạng xã hội (Facebook, etc.)

#### Danh Sách Tác Phẩm (Archive)
- [ ] Hiển thị lưới / danh sách tác phẩm
- [ ] Filter theo: thể loại, tag, bộ sưu tập, năm
- [ ] Sort theo: mới nhất, cũ nhất, tên A-Z
- [ ] Phân trang (pagination) hoặc infinite scroll
- [ ] Breadcrumb navigation

#### Trang Chi Tiết Tác Phẩm (Work Detail)
- [ ] Hiển thị nội dung với typography đẹp
- [ ] Thông tin: tiêu đề, thể loại, ngày đăng, tag
- [ ] Ảnh bìa / media đi kèm
- [ ] Phần "Tác phẩm liên quan" (cùng thể loại/tag)
- [ ] Nút chia sẻ: Facebook, Twitter/X, copy link
- [ ] Điều hướng: bài trước / bài tiếp theo

#### Tìm Kiếm
- [ ] Tìm kiếm theo tiêu đề, nội dung, tag
- [ ] Gợi ý tìm kiếm (search suggestions)
- [ ] Kết quả có highlight từ khóa

#### Trang Tag / Thể Loại / Bộ Sưu Tập
- [ ] Trang riêng cho từng tag, thể loại, collection
- [ ] SEO-friendly URL (slug): `/the-loai/tho`, `/tag/tinh-yeu`, `/bo-suu-tap/ra-vuon-nhat-nang`

#### SEO & Chia Sẻ
- [ ] Slug đẹp, tùy chỉnh được
- [ ] Meta title + description riêng cho mỗi trang
- [ ] Open Graph tags (chia sẻ Facebook, Zalo)
- [ ] Twitter Card
- [ ] Sitemap XML tự động
- [ ] RSS Feed
- [ ] Canonical URL
- [ ] Structured Data (JSON-LD) cho Article

---

## 4. Data Model

### 4.1 Work (Tác Phẩm) — Core Entity

```
Work {
  id                UUID (PK)
  title             String (required)
  slug              String (unique, auto-generated from title, editable)
  genre             Enum: poem | novel | essay | prose | painting | photo | video
  content           Text (rich text / markdown — hỗ trợ line breaks cho thơ)
  excerpt           Text (trích đoạn, tự động lấy từ content hoặc nhập tay)
  cover_image_url   String (URL ảnh bìa)
  media             JSON (mảng media objects: {type, url, caption})
  
  status            Enum: draft | published | scheduled
  published_at      DateTime (nullable)
  scheduled_at      DateTime (nullable)
  
  is_featured       Boolean (ghim trên trang chủ)
  
  seo_title         String (nullable, override meta title)
  seo_description   String (nullable, override meta description)
  og_image_url      String (nullable, override OG image)
  
  view_count        Integer (default 0)
  
  created_at        DateTime
  updated_at        DateTime
  deleted_at        DateTime (nullable — soft delete)
  
  // Relations
  tags              Tag[] (many-to-many)
  collections       Collection[] (many-to-many)
}
```

### 4.2 Tag

```
Tag {
  id    UUID (PK)
  name  String
  slug  String (unique)
}
```

### 4.3 Collection (Bộ Sưu Tập)

```
Collection {
  id          UUID (PK)
  title       String
  slug        String (unique)
  description Text (nullable)
  cover_image String (nullable)
  order       Integer (thứ tự hiển thị)
  created_at  DateTime
}
```

### 4.4 Media

```
Media {
  id          UUID (PK)
  filename    String
  url         String
  type        Enum: image | video | pdf
  size        Integer (bytes)
  width       Integer (nullable — cho ảnh)
  height      Integer (nullable — cho ảnh)
  alt_text    String (nullable)
  created_at  DateTime
}
```

### 4.5 Author Profile (Static/Configurable)

```
AuthorProfile {
  name              String
  bio               Text
  bio_short         String
  avatar_url        String
  cover_image_url   String
  social_links      JSON  {facebook, instagram, twitter, ...}
  awards            JSON  [{title, year, description}]
  publications      JSON  [{title, year, publisher}]
}
```

### 4.6 Admin User

```
AdminUser {
  id            UUID (PK)
  email         String (unique)
  password_hash String
  created_at    DateTime
  last_login_at DateTime
}
```

---

## 5. Kiến Trúc Kỹ Thuật

### 5.1 Lựa Chọn Tech Stack

**Phương án đề xuất: Next.js (Full-stack) + PostgreSQL/SQLite**

Lý do:
- Next.js xử lý cả frontend (Public Site) lẫn backend API (CMS endpoints) trong một codebase.
- SSR/SSG cho SEO tốt, trang public load nhanh.
- App Router của Next.js 14+ phân tách rõ `/app/(public)/` và `/app/(cms)/`.
- PostgreSQL (production) hoặc SQLite (development/nhỏ) — linh hoạt.
- Dễ deploy lên Vercel, Railway, hoặc VPS.

**Stack chi tiết:**

| Layer | Công nghệ |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (prod) / SQLite (dev) |
| ORM | Prisma |
| Auth | NextAuth.js (credentials provider) |
| Rich Text Editor | TipTap (hỗ trợ tốt poetry formatting) |
| File Upload | Uploadthing hoặc Cloudinary SDK |
| File Storage | Cloudinary / AWS S3 / local |
| Search | PostgreSQL full-text search (cơ bản) hoặc Meilisearch (nâng cao) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| SEO | next-seo / Next.js built-in metadata API |
| Sitemap | next-sitemap |
| Deployment | Vercel hoặc VPS (Docker) |

### 5.2 Cấu Trúc Thư Mục

```
/
├── app/
│   ├── (public)/              # Public site
│   │   ├── page.tsx           # Homepage
│   │   ├── gioi-thieu/        # About page
│   │   ├── tac-pham/          # Archive / listing
│   │   │   ├── page.tsx
│   │   │   └── [slug]/        # Work detail
│   │   ├── the-loai/[genre]/
│   │   ├── tag/[slug]/
│   │   ├── bo-suu-tap/[slug]/
│   │   └── tim-kiem/
│   ├── (cms)/                 # CMS (protected)
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── tac-pham/
│   │   │   ├── page.tsx       # List works
│   │   │   ├── them-moi/      # Create
│   │   │   └── [id]/          # Edit
│   │   ├── bo-suu-tap/
│   │   ├── tag/
│   │   ├── media/
│   │   └── cai-dat/           # Settings (author profile)
│   └── api/
│       ├── auth/
│       ├── works/
│       ├── collections/
│       ├── tags/
│       ├── media/
│       └── public/            # Public read-only endpoints
├── components/
│   ├── public/                # Components cho public site
│   └── cms/                   # Components cho CMS
├── lib/
│   ├── db.ts                  # Prisma client
│   ├── auth.ts                # NextAuth config
│   └── utils.ts
├── prisma/
│   └── schema.prisma
└── public/
```

### 5.3 Các Đặc Điểm Kỹ Thuật Quan Trọng

**Poetry Formatting:**
- Sử dụng TipTap editor với extension `HardBreak` và `Paragraph` tùy chỉnh.
- Khi render thơ trên public: dùng `white-space: pre-wrap` hoặc CSS `font-family` monospace cho những đoạn thơ cần giữ indent.
- Phân biệt rõ: thơ (preserve line break) vs văn xuôi (paragraph wrap).

**Media Handling:**
- Ảnh: resize/optimize tự động qua Cloudinary (hoặc Next.js Image Optimization).
- Video: embed từ YouTube/Vimeo URL, hoặc upload MP4 lưu trên Cloudinary/S3.
- Giới hạn upload: ảnh max 10MB, video max 500MB.

**Search:**
- Short term: PostgreSQL `tsvector` full-text search (tiếng Việt với `unaccent`).
- Long term nếu cần: Meilisearch hoặc Algolia cho Vietnamese search tốt hơn.

**Bulk Import:**
- Tool import từ JSON: `{"title": "...", "content": "...", "genre": "poem", "tags": ["tình yêu"]}`
- Script admin chạy một lần để seed 1.000 tác phẩm ban đầu.

---

## 6. Yêu Cầu SEO & Sharing

### 6.1 URL Structure

```
/                                    # Homepage
/gioi-thieu                          # About author
/tac-pham                            # All works
/tac-pham/[slug-bai-tho]             # Work detail
/the-loai/tho                        # Genre: poem
/the-loai/tieu-thuyet                # Genre: novel
/the-loai/tuy-but                    # Genre: prose
/tag/[slug-tag]                      # Tag page
/bo-suu-tap/[slug]                   # Collection page
/tim-kiem?q=[query]                  # Search results
```

### 6.2 Meta & Open Graph

Mỗi trang (đặc biệt trang tác phẩm) cần:
- `<title>` riêng: `{Tiêu đề} - Nguyễn Thế Hoàng Linh`
- `<meta name="description">`: excerpt ngắn của tác phẩm
- `og:title`, `og:description`, `og:image` (thumbnail tác phẩm)
- `og:type`: `article` cho trang chi tiết
- `twitter:card`: `summary_large_image`
- `article:author`, `article:published_time`

### 6.3 Technical SEO

- Sitemap XML: tự động generate, include tất cả published works.
- RSS Feed: `/rss.xml` để reader apps có thể subscribe.
- Robots.txt: block `/api/`, `/cms/`, allow everything else.
- Canonical URL: tránh duplicate content.
- Breadcrumb Schema (JSON-LD).
- Article Schema (JSON-LD) cho tác phẩm.

---

## 7. Yêu Cầu Giao Diện & UX

### 7.1 Design Principles

1. **Tối giản (Minimalism):** Ưu tiên nội dung, loại bỏ mọi yếu tố thừa.
2. **Typography làm trung tâm:** Font serif đẹp cho nội dung đọc, sans-serif cho UI. Gợi ý: `Lora` hoặc `Playfair Display` cho body thơ, `Inter` cho UI.
3. **Khoảng trắng:** Generous line-height (1.8+), paragraph spacing rộng.
4. **Màu sắc:** Neutral & warm. Đề xuất: nền trắng ngà/kem, text đen/đậm, accent nhẹ (sage green, warm gray hoặc dusty rose).
5. **Responsive-first:** Thiết kế mobile-first vì phần lớn độc giả đọc trên điện thoại.

### 7.2 Key User Flows

**Độc giả tìm thơ:**
1. Vào trang chủ → scroll qua tác phẩm nổi bật
2. Nhấn vào thể loại "Thơ" → xem danh sách
3. Filter theo tag hoặc bộ sưu tập
4. Nhấn vào bài thơ → đọc → chia sẻ

**Tác giả đăng bài:**
1. Vào `/cms/login`
2. Dashboard → "Tạo tác phẩm mới"
3. Điền tiêu đề, chọn genre, viết nội dung (rich text / markdown)
4. Thêm tag, chọn collection, upload ảnh bìa
5. Preview → Publish / Save draft

### 7.3 Reading Experience

- Trang đọc thơ: width giới hạn ~680px (không quá rộng), center-aligned.
- Tùy chọn font size (optional: S/M/L).
- Không có sidebar cạnh tranh sự chú ý khi đang đọc.
- Scroll progress indicator (optional).

---

## 8. Yêu Cầu Phi Chức Năng

| Yêu cầu | Chi tiết |
|---------|----------|
| Performance | Core Web Vitals tốt: LCP < 2.5s, CLS < 0.1 |
| Accessibility | WCAG 2.1 AA (contrast ratio, alt text, keyboard navigation) |
| Mobile | Responsive đầy đủ, touch-friendly |
| Security | HTTPS, auth bảo vệ CMS, input sanitization |
| Backup | Database backup định kỳ (nếu dùng VPS) |
| Scalability | Hỗ trợ ít nhất 1.000 tác phẩm, 10.000 lượt xem/tháng ban đầu |
| Uptime | 99.9% (Vercel SDà đáp ứng) |

---

## 9. Roadmap (Phân Giai Đoạn)

| Phase | Scope | Ước tính |
|-------|-------|----------|
| Phase 1 | Setup project, DB schema, Auth | 1-2 ngày |
| Phase 2 | CMS cơ bản: CRUD tác phẩm, tag, collection | 3-5 ngày |
| Phase 3 | Public site: Homepage, listing, detail | 3-4 ngày |
| Phase 4 | Media upload, bulk import tool | 2-3 ngày |
| Phase 5 | Search, SEO, sitemap, RSS | 2-3 ngày |
| Phase 6 | UI polish, responsive, testing | 2-3 ngày |
| Phase 7 | Deployment, domain setup | 1 ngày |

**Tổng ước tính: ~2-3 tuần phát triển tích cực**

---

## 10. Out of Scope (Không Thuộc Phạm Vi V1)

- Hệ thống comment của độc giả (có thể dùng Giscus sau)
- Newsletter / email subscription
- E-commerce / bán sách
- Multi-language (EN/VN)
- Mobile app (iOS/Android)
- Analytics dashboard nâng cao (dùng Google Analytics/Plausible external)
- Tính năng cộng đồng (forum, reaction)

---

*Document này là PRD cho phiên bản 1.0. Cập nhật theo từng sprint.*
