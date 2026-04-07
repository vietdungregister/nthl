# Hệ Sinh Thái Văn Học Số — Nguyễn Thế Hoàng Linh

> Thư viện chính chủ cho nhà thơ Nguyễn Thế Hoàng Linh — ~25,215 tác phẩm, AI-powered semantic search.

> [!IMPORTANT]
> **AI Agents**: Trước khi làm bất kỳ task nào, **BẮT BUỘC** đọc [`CLAUDE.md`](CLAUDE.md) — đây là **Functional Requirements Document (FRD)** chứa toàn bộ kiến trúc, data model, quy tắc code, và danh sách file quan trọng của dự án. Bỏ qua bước này sẽ dẫn đến lỗi.

**Live:** [http://188.166.177.93:3001](http://188.166.177.93:3001)

---

## Tổng Quan

Web app gồm 3 thành phần:

| Thành phần | Mô tả |
|---|---|
| **Public Site** | Duyệt, đọc, tìm kiếm tác phẩm — mobile-first, typography đẹp |
| **CMS Admin** | Quản lý kho tác phẩm — CRUD, phân loại, xuất bản |
| **AI Search Engine** | Hybrid vector (pgvector) + full-text search — tìm kiếm theo nghĩa, cảm xúc |

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | PostgreSQL + pgvector (HNSW index) |
| ORM | Prisma |
| Auth | NextAuth.js v5 (JWT, credentials) |
| Embedding | OpenAI text-embedding-3-large (3072d) |
| Styling | Vanilla CSS |
| Deployment | Docker (multi-stage Alpine) + DigitalOcean VPS |
| CI/CD | GitHub Actions (auto build → push → deploy) |

## Development Setup

### Prerequisites
- Node.js 20+
- Docker Desktop (for PostgreSQL + pgvector)
- OpenAI API key (for AI search)

### Quick Start

```bash
# 1. Clone & install
git clone https://github.com/vietdungregister/nthl.git
cd nthl
npm install

# 2. Khởi động PostgreSQL
docker compose up db -d

# 3. Cấu hình environment
cp .env.example .env.local
# Sửa: DATABASE_URL, NEXTAUTH_SECRET, OPENAI_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

# 4. Database setup
npx prisma migrate deploy
npx tsx prisma/seed.ts

# 5. Chạy dev server
npm run dev
# → http://localhost:3000
# → CMS: http://localhost:3000/cms/login
```

### Health Check

```bash
node scripts/health-check.js
```

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── (public)/          # Public site (sidebar layout)
│   │   ├── cms/               # CMS admin pages
│   │   ├── tac-pham/[slug]/   # Work detail
│   │   └── api/               # API routes
│   ├── components/            # React components
│   └── lib/                   # Shared utilities (cache, db, auth, search)
├── prisma/                    # Database schema & migrations
├── scripts/                   # Utility scripts (import, deploy, maintenance)
├── .agents/skills/            # AI agent skills (deploy, import-works, crawl-forums)
├── Dockerfile                 # Multi-stage Alpine build
└── docker-compose.yml         # PostgreSQL + App
```

## Key Files

| File | Vai trò |
|---|---|
| `CLAUDE.md` | Product Requirements Document — source of truth |
| `src/lib/cache.ts` | Server-side cache (genres, tags, books, collections) |
| `src/lib/chunkAndEmbed.ts` | Auto chunk + embed khi tạo/sửa work qua CMS |
| `src/app/api/ai-search/route.ts` | Hybrid vector + text search API |
| `src/components/public/WorksSmartSearch.tsx` | Smart search integrated UI |

## Deployment

### CI/CD (Recommended)
Push to `master` → GitHub Actions auto build → push Docker Hub → deploy server.

### Manual
```bash
# Xem skill chi tiết:
cat .agents/skills/deploy-to-server/SKILL.md
```

## Data Import

Import batch tác phẩm từ Facebook JSON:
```bash
cat .agents/skills/import-works/SKILL.md
```

Crawl & import từ diễn đàn (tienve, gio-o, ttvnol):
```bash
cat .agents/skills/crawl-forums/SKILL.md
```

## License

Private — All rights reserved.
