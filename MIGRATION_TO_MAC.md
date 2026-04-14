# MIGRATION GUIDE: Windows → MacBook Air 2022 (Apple Silicon M2)

> **Dự án:** Hệ Sinh Thái Văn Học Số — Nguyễn Thế Hoàng Linh
> **Repo:** `https://github.com/vietdungregister/nthl.git`
> **Ngày tạo:** 2026-03-27
> **Mục đích:** File hướng dẫn cho AI Agent đọc và thực thi tự động trên máy Mac mới.
> **Target Agent:** Claude Code (Sonnet 4.6) hoặc Gemini Pro

---

## MỤC LỤC

1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Yêu Cầu Phần Cứng & Phần Mềm](#2-yêu-cầu-phần-cứng--phần-mềm)
3. [Bước 1 — Cài Đặt Công Cụ Nền Tảng](#3-bước-1--cài-đặt-công-cụ-nền-tảng)
4. [Bước 2 — Clone Repo & Cập Nhật Prisma Config](#4-bước-2--clone-repo--cập-nhật-prisma-config)
5. [Bước 3 — Cấu Hình Environment Variables](#5-bước-3--cấu-hình-environment-variables)
6. [Bước 4 — Khởi Động PostgreSQL (Docker)](#6-bước-4--khởi-động-postgresql-docker)
7. [Bước 5 — Migrate Database Schema](#7-bước-5--migrate-database-schema)
8. [Bước 6 — Import Dữ Liệu Từ Máy Windows (Data Migration)](#8-bước-6--import-dữ-liệu-từ-máy-windows)
9. [Bước 7 — Copy Upload Files](#9-bước-7--copy-upload-files)
10. [Bước 8 — Cài Dependencies & Chạy Dev Server](#10-bước-8--cài-dependencies--chạy-dev-server)
11. [Bước 9 — Xác Minh Hoạt Động](#11-bước-9--xác-minh-hoạt-động)
12. [Bước 10 — Cài AI Agent & Editor](#12-bước-10--cài-ai-agent--editor)
13. [Bước 11 — Restore Antigravity Workspace (Brain & Conversations)](#13-bước-11--restore-antigravity-workspace)
14. [Bước 12 — Facebook JSON (Phase 1A — Tải Riêng Trên Mac)](#14-bước-12--facebook-json)
15. [Troubleshooting](#15-troubleshooting)
16. [Tham Khảo: Thông Tin Môi Trường Windows Gốc](#16-tham-khảo-thông-tin-môi-trường-windows-gốc)

---

## 1. Tổng Quan Dự Án

| Thuộc tính | Giá trị |
|------------|---------|
| **Tên project** | `baitapcuoikhoa` (Literary Archive — NTHL) |
| **Tech stack** | Next.js 16.1.6 + TypeScript + React 19 |
| **ORM** | Prisma 6.19.2 |
| **Database** | PostgreSQL 16 (chạy qua Docker, port `5433`) |
| **Styling** | Tailwind CSS 4 + PostCSS |
| **Auth** | NextAuth.js v5 beta (JWT, admin-only) |
| **AI** | OpenAI API (GPT-4o-mini, embeddings) |
| **Build output** | Standalone (Docker multi-stage) |
| **Deploy** | Docker Compose → VPS `188.166.177.93:3001` |
| **Git remote** | `https://github.com/vietdungregister/nthl.git` |

### Cấu trúc thư mục chính

```
baitapcuoikhoa/
├── src/
│   ├── app/          # Next.js App Router (pages, API routes)
│   ├── components/   # React components
│   ├── lib/          # Utilities, helpers, auth config
│   └── middleware.ts  # Auth middleware
├── prisma/
│   ├── schema.prisma  # Database schema (10 models)
│   ├── migrations/    # 2 migrations (init + indexes)
│   ├── seed.ts        # DB seeding scripts
│   └── dev.db         # SQLite backup (không dùng cho production)
├── public/
│   └── uploads/       # User-uploaded media (12 files: jpg, png, mp4)
├── .env               # Environment variables (KHÔNG có trên Git)
├── .env.local         # Override env (KHÔNG có trên Git)
├── .env.example       # Template env (CÓ trên Git)
├── docker-compose.yml # PostgreSQL + App services
├── Dockerfile         # Multi-stage build
├── CLAUDE.md          # Product Requirements Document v2.0
├── next.config.ts     # Standalone output + security headers
└── package.json       # Dependencies
```

### Database Models (10 models trong `prisma/schema.prisma`)

1. `AdminUser` — Tài khoản admin CMS
2. `Work` — Tác phẩm văn học (core entity)
3. `Comment` — Bình luận
4. `Tag` — Nhãn phân loại
5. `Collection` — Bộ sưu tập
6. `WorkTag` — Junction: Work ↔ Tag
7. `WorkCollection` — Junction: Work ↔ Collection
8. `Media` — File đa phương tiện
9. `AuthorProfile` — Hồ sơ tác giả (singleton)
10. `Genre` — Thể loại
11. `Book` — Sách

---

## 2. Yêu Cầu Phần Cứng & Phần Mềm

| Yêu cầu | Chi tiết |
|----------|----------|
| **Máy** | MacBook Air 2022 (M2 chip, ARM64) — 24GB RAM |
| **macOS** | Sonoma 14+ hoặc Sequoia 15+ |
| **Disk** | Tối thiểu 5GB trống cho project + Docker images |

### Phần mềm cần cài

| Tool | Version yêu cầu | Ghi chú |
|------|-----------------|---------|
| **Homebrew** | Latest | Package manager cho macOS |
| **Node.js** | `v24.x` (LTS) | Khớp với máy Windows: v24.13.0 |
| **npm** | `11.x` | Đi kèm Node.js v24 |
| **Git** | Latest | Quản lý source code |
| **Docker Desktop** | Latest (Apple Silicon) | Chạy PostgreSQL |
| **VS Code** | Latest | Editor (hoặc Cursor) |

---

## 3. Bước 1 — Cài Đặt Công Cụ Nền Tảng

> ⚠️ **CHÚ Ý CHO AI AGENT:** Tất cả lệnh dưới đây chạy trên **macOS Terminal (zsh)**. Một số lệnh cần `sudo` hoặc quyền admin.

### 3.1 Cài Homebrew (nếu chưa có)

```bash
# Kiểm tra Homebrew đã cài chưa
which brew

# Nếu chưa có, cài Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Sau khi cài xong, thêm vào PATH (Apple Silicon)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# Xác minh
brew --version
```

### 3.2 Cài Git

```bash
# macOS có sẵn git qua Xcode CLT, nhưng nên cài bản mới nhất
brew install git

# Cấu hình git user (BẮT BUỘC)
git config --global user.name "duongvietdung"
git config --global user.email "duongvietdung@users.noreply.github.com"
# ⚠️ Agent: Hỏi user email thật nếu cần. Email trên là placeholder.

# Xác minh
git --version
```

### 3.3 Cài Node.js v24 (qua nvm — khuyến nghị)

```bash
# Cài nvm (Node Version Manager) — linh hoạt hơn cài trực tiếp
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Load nvm vào shell hiện tại
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Cài Node.js v24 (khớp với máy Windows: v24.13.0)
nvm install 24
nvm use 24
nvm alias default 24

# Xác minh
node --version   # → v24.x.x
npm --version    # → 11.x.x
```

> **THAY THẾ:** Nếu không muốn dùng nvm, cài trực tiếp qua Homebrew:
> ```bash
> brew install node@24
> ```

### 3.4 Cài Docker Desktop cho Apple Silicon

```bash
# Tải và cài Docker Desktop cho Mac (Apple Silicon / M2)
brew install --cask docker

# Mở Docker Desktop lần đầu để hoàn tất setup
open -a Docker

# Chờ Docker khởi động xong (icon Docker trên menu bar chuyển sang "running")
# Xác minh
docker --version
docker compose version
```

> ⚠️ **QUAN TRỌNG:** Docker Desktop cần được mở ít nhất 1 lần thủ công để chấp nhận License Agreement. Sau đó có thể chạy từ CLI.

---

## 4. Bước 2 — Clone Repo & Cập Nhật Prisma Config

### 4.1 Clone repository

```bash
# Chọn thư mục làm việc (ví dụ: ~/Projects)
mkdir -p ~/Projects
cd ~/Projects

# Clone repo
git clone https://github.com/vietdungregister/nthl.git baitapcuoikhoa
cd baitapcuoikhoa
```

### 4.2 Cập nhật Prisma `binaryTargets` cho Apple Silicon

Mở file `prisma/schema.prisma` và **thay đổi** `binaryTargets`:

```diff
generator client {
  provider      = "prisma-client-js"
- binaryTargets = ["native", "debian-openssl-1.1.x"]
+ binaryTargets = ["native", "debian-openssl-1.1.x", "darwin-arm64"]
}
```

> **Giải thích:** `darwin-arm64` là target cho Apple Silicon (M1/M2/M3). `native` sẽ tự detect, nhưng liệt kê tường minh cho chắc chắn. Giữ lại `debian-openssl-1.1.x` cho Docker build.

---

## 5. Bước 3 — Cấu Hình Environment Variables

### 5.1 Tạo file `.env`

```bash
# Copy template
cp .env.example .env
```

### 5.2 Điền nội dung `.env`

Mở `.env` và điền chính xác các giá trị sau:

```env
# --- Database ---
# PostgreSQL chạy qua Docker, port 5433 (tránh conflict)
DATABASE_URL="postgresql://vibe_user:vibe_pass@localhost:5433/vibe_db"

# --- NextAuth.js ---
# Tạo secret mới cho máy Mac (chạy lệnh bên dưới)
NEXTAUTH_SECRET="<SINH_TỰ_ĐỘNG>"
NEXTAUTH_URL="http://localhost:3000"

# --- Admin Account ---
ADMIN_EMAIL="admin@admin.com"
ADMIN_PASSWORD="admin"

# --- OpenAI API ---
OPENAI_API_KEY="<COPY_TỪ_FILE_DATA_MIGRATION>"
```

### 5.3 Sinh NEXTAUTH_SECRET mới

```bash
# Chạy lệnh này và paste kết quả vào .env
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### 5.4 Tạo file `.env.local` (override OpenAI key cho dev)

```bash
cat > .env.local << 'EOF'
# OpenAI API Key — cần thiết cho tính năng Thủ Thư AI
# Lấy tại https://platform.openai.com/api-keys
OPENAI_API_KEY=<PASTE_KEY_CỦA_BẠN_VÀO_ĐÂY>
EOF
```

> ⚠️ **CHÚ Ý CHO AI AGENT:** Các OpenAI API key cần được user cung cấp thủ công, hoặc lấy từ file `DATA_MIGRATION_PACKAGE.zip` mà user copy từ máy Windows sang (xem Bước 6).

---

## 6. Bước 4 — Khởi Động PostgreSQL (Docker)

### 6.1 Chỉ khởi động service `db` (không cần app container cho dev)

```bash
# Khởi động PostgreSQL container
docker compose up -d db

# Chờ container healthy
docker compose ps

# Kiểm tra PostgreSQL đã sẵn sàng
docker exec vibe-db pg_isready -U vibe_user -d vibe_db
# Output mong đợi: "localhost:5432 - accepting connections"
```

### 6.2 Xác minh kết nối từ host machine

```bash
# Test kết nối từ máy Mac tới PostgreSQL container
docker exec vibe-db psql -U vibe_user -d vibe_db -c "SELECT version();"
# Output mong đợi: PostgreSQL 16.x
```

---

## 7. Bước 5 — Migrate Database Schema

```bash
# Chạy tất cả migrations đã có
npx prisma migrate deploy

# Generate Prisma Client cho macOS (Apple Silicon)
npx prisma generate

# Xác minh schema đã được tạo
docker exec vibe-db psql -U vibe_user -d vibe_db -c "\dt"
# Output mong đợi: 11 tables (AdminUser, Work, Comment, Tag, Collection, WorkTag, WorkCollection, Media, AuthorProfile, Genre, Book, + _prisma_migrations)
```

---

## 8. Bước 6 — Import Dữ Liệu Từ Máy Windows (Data Migration)

> ⚠️ **ĐÂY LÀ BƯỚC QUAN TRỌNG NHẤT** — Cần dữ liệu thật từ máy Windows.

### 8.1 TRÊN MÁY WINDOWS: Export dữ liệu PostgreSQL

Chạy lệnh sau trên máy Windows (PowerShell) để export toàn bộ database:

```powershell
# Export toàn bộ database thành file SQL
docker exec vibe-db pg_dump -U vibe_user -d vibe_db --no-owner --no-acl --clean --if-exists > db_backup.sql

# Kiểm tra file đã tạo
Get-Item db_backup.sql
# File size nên > 0 bytes
```

### 8.2 TRÊN MÁY WINDOWS: Đóng gói tất cả file cần copy

Tạo thư mục chứa tất cả file cần chuyển:

```powershell
# Tạo thư mục đóng gói
mkdir DATA_MIGRATION_PACKAGE

# 1. Copy database dump
copy db_backup.sql DATA_MIGRATION_PACKAGE\

# 2. Copy env files (chứa API keys)
copy .env DATA_MIGRATION_PACKAGE\env_backup.txt
copy .env.local DATA_MIGRATION_PACKAGE\env_local_backup.txt

# 3. Copy uploaded media files
xcopy /E /I public\uploads DATA_MIGRATION_PACKAGE\uploads

# 4. Copy Claude Code settings (nếu dùng Claude Code)
xcopy /E /I .claude DATA_MIGRATION_PACKAGE\claude_settings
```

### 8.3 Chuyển `DATA_MIGRATION_PACKAGE` sang máy Mac

Có nhiều cách:
- **USB Drive** — Copy thư mục `DATA_MIGRATION_PACKAGE` vào USB, cắm sang Mac
- **AirDrop** — Nén thành `.zip` rồi AirDrop
- **Cloud Drive** — Upload lên Google Drive / iCloud / Dropbox rồi tải về Mac
- **SCP/SSH** — Nếu cả 2 máy cùng mạng LAN

```bash
# Nén trên Windows (PowerShell)
Compress-Archive -Path DATA_MIGRATION_PACKAGE -DestinationPath DATA_MIGRATION_PACKAGE.zip
```

### 8.4 TRÊN MÁY MAC: Import database dump

```bash
# Giả sử file đã copy vào ~/Downloads/DATA_MIGRATION_PACKAGE/
cd ~/Downloads/DATA_MIGRATION_PACKAGE

# Import database dump vào PostgreSQL container
cat db_backup.sql | docker exec -i vibe-db psql -U vibe_user -d vibe_db

# Xác minh dữ liệu đã import thành công
docker exec vibe-db psql -U vibe_user -d vibe_db -c "SELECT COUNT(*) FROM \"Work\";"
docker exec vibe-db psql -U vibe_user -d vibe_db -c "SELECT COUNT(*) FROM \"AdminUser\";"
docker exec vibe-db psql -U vibe_user -d vibe_db -c "SELECT COUNT(*) FROM \"Genre\";"
docker exec vibe-db psql -U vibe_user -d vibe_db -c "SELECT COUNT(*) FROM \"Tag\";"
docker exec vibe-db psql -U vibe_user -d vibe_db -c "SELECT COUNT(*) FROM \"Media\";"
docker exec vibe-db psql -U vibe_user -d vibe_db -c "SELECT COUNT(*) FROM \"Book\";"
# Tất cả COUNT nên > 0 (trừ khi table đó chưa có data)
```

### 8.5 TRÊN MÁY MAC: Restore API keys từ env backup

```bash
# Mở file backup để lấy API keys
cat ~/Downloads/DATA_MIGRATION_PACKAGE/env_backup.txt
# → Copy OPENAI_API_KEY value vào .env và .env.local của project

cat ~/Downloads/DATA_MIGRATION_PACKAGE/env_local_backup.txt
# → Copy OPENAI_API_KEY value vào .env.local nếu khác
```

---

## 9. Bước 7 — Copy Upload Files

```bash
# Copy uploaded media từ migration package vào project
cp -r ~/Downloads/DATA_MIGRATION_PACKAGE/uploads/* ~/Projects/baitapcuoikhoa/public/uploads/

# Xác minh
ls -la ~/Projects/baitapcuoikhoa/public/uploads/
# Mong đợi: 12 files (jpg, png, mp4)
```

### Danh sách files upload cần có

```
public/uploads/
├── 1772160934912-E5B0A76F-1B6E-48CC-91DF-6070E76BC15D.jpg
├── 1772165530341-ChatGPT_Image_Dec_2__2025__12_40_53_AM.png
├── 1772165567437-c9762f58-f795-4fc7-b478-2e14da40768b.png
├── 1772165613692-KISHIYA-12544.mp4
├── 1772169024756-C559BE39-6A99-4A6A-9719-4280663B4E39.jpg
├── 1772169515455-KISHIYA-12544.mp4
├── 1772169522626-KISHIYA-12544.mp4
├── 1772173638653-ChatGPT_Image_Dec_2__2025__12_40_53_AM.png
├── 1772173646031-E5B0A76F-1B6E-48CC-91DF-6070E76BC15D.jpg
├── 1772199507062-029EC13D-7774-4C5A-B89D-3472F5473176.jpg
├── 1772199833498-KISHIYA-12544.mp4
└── 1772200020770-KISHIYA-12544.mp4
```

---

## 10. Bước 8 — Cài Dependencies & Chạy Dev Server

```bash
cd ~/Projects/baitapcuoikhoa

# Cài tất cả dependencies
npm ci

# Generate Prisma Client (cho Apple Silicon)
npx prisma generate

# Chạy dev server
npm run dev
```

### Kết quả mong đợi

```
  ▲ Next.js 16.1.6
  - Local:        http://localhost:3000
  - Environments: .env.local, .env

 ✓ Starting...
 ✓ Ready in Xs
```

### Kiểm tra nhanh

| URL | Mong đợi |
|-----|----------|
| `http://localhost:3000` | Trang chủ public site hiển thị tác phẩm |
| `http://localhost:3000/cms/dashboard` | Redirect sang login nếu chưa đăng nhập |
| `http://localhost:3000/api/genres` | JSON danh sách genres |

---

## 11. Bước 9 — Xác Minh Hoạt Động

Chạy checklist sau để đảm bảo mọi thứ hoạt động:

```bash
# 1. PostgreSQL container đang chạy
docker compose ps
# → Service "db" phải ở trạng thái "Up" và "healthy"

# 2. Database có dữ liệu
docker exec vibe-db psql -U vibe_user -d vibe_db -c "SELECT COUNT(*) as works FROM \"Work\";"

# 3. Dev server chạy được
curl -s http://localhost:3000 | head -20
# → Phải trả về HTML

# 4. API hoạt động
curl -s http://localhost:3000/api/genres | head -5
# → Phải trả về JSON

# 5. Prisma Studio (optional — UI xem DB)
npx prisma studio
# → Mở browser tại http://localhost:5555
```

---

## 12. Bước 10 — Cài AI Agent & Editor

### 12.1 VS Code

```bash
brew install --cask visual-studio-code

# Hoặc Cursor (AI-native editor)
brew install --cask cursor
```

### 12.2 Claude Code CLI (nếu dùng Claude Code Agent)

```bash
# Cài Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Restore settings (từ migration package)
mkdir -p ~/Projects/baitapcuoikhoa/.claude
cp ~/Downloads/DATA_MIGRATION_PACKAGE/claude_settings/settings.json ~/Projects/baitapcuoikhoa/.claude/

# ⚠️ QUAN TRỌNG: File settings.local.json chứa path Windows (C:\Users\...)
# Cần sửa lại path cho macOS. Xóa file cũ hoặc tạo mới:
rm -f ~/Projects/baitapcuoikhoa/.claude/settings.local.json
```

> **Lưu ý:** File `.claude/settings.json` chứa các permission rules (Bash commands). Một số path và lệnh là Windows-specific và cần được agent điều chỉnh khi chạy trên macOS.

### 12.3 Antigravity (Gemini extension — nếu dùng VS Code)

Cài extension Antigravity trực tiếp từ VS Code Marketplace.

---

## 13. Bước 11 — Restore Antigravity Workspace (Brain & Conversations)

> ⚠️ **QUAN TRỌNG:** Bước này cho phép AI Agent trên máy Mac kế thừa toàn bộ **bộ nhớ, lịch sử hội thoại, và context** từ máy Windows. Đây là thứ giúp agent "nhớ" mọi thứ đã làm trước đó.

### 13.1 Cấu trúc workspace Antigravity

Migration package chứa thư mục `antigravity_workspace/` — đây là bản sao nguyên vẹn từ `C:\Users\duongvietdung\.gemini\antigravity\` trên Windows:

```
antigravity_workspace/
├── brain/               # 35 conversation brain logs (~70MB)
│   ├── <conversation-id>/
│   │   ├── overview.txt
│   │   └── .system_generated/logs/
│   └── ...
├── conversations/       # 35 conversation protobuf files (~70MB)
│   └── <conversation-id>.pb
├── implicit/            # Implicit context data (~5MB)
├── knowledge/           # Knowledge Items (curated context)
├── annotations/         # Code annotations
├── browser_recordings/  # Browser session recordings
├── code_tracker/        # Code change tracking
├── html_artifacts/      # Generated HTML artifacts
├── playground/          # Playground experiments
├── prompting/           # Custom prompting config
├── installation_id      # Unique installation identifier
├── onboarding.json      # Onboarding state
└── mcp_config.json      # MCP server configuration
```

### 13.2 Restore trên macOS

```bash
# Tạo thư mục Antigravity trên Mac (macOS path)
mkdir -p ~/.gemini/antigravity

# Copy toàn bộ workspace từ migration package
# Giả sử migration package đã giải nén tại ~/Downloads/MIGRATION_PACKAGE/
cp -r ~/Downloads/MIGRATION_PACKAGE/antigravity_workspace/* ~/.gemini/antigravity/

# Xác minh
ls -la ~/.gemini/antigravity/
# Mong đợi: brain/, conversations/, implicit/, knowledge/, etc.

ls ~/.gemini/antigravity/brain/ | wc -l
# Mong đợi: 35 (conversation directories)

ls ~/.gemini/antigravity/conversations/ | wc -l
# Mong đợi: 35 (.pb files)
```

### 13.3 Lưu ý quan trọng

1. **Path differences:** Antigravity trên Windows lưu tại `C:\Users\duongvietdung\.gemini\antigravity\`, trên macOS tại `~/.gemini/antigravity/`. File protobuf (.pb) không chứa hardcoded paths nên copy trực tiếp được.

2. **installation_id:** File này chứa UUID định danh máy. Có thể giữ nguyên hoặc tạo mới — không ảnh hưởng chức năng.

3. **mcp_config.json:** Nếu có cấu hình MCP servers, kiểm tra lại paths vì có thể chứa đường dẫn Windows.

4. **Dung lượng:** Toàn bộ workspace ~227MB. Đây là bộ nhớ dài hạn của agent, chứa context về:
   - Kiến trúc dự án NTHL
   - Các quyết định kỹ thuật đã thống nhất
   - Lịch sử debug / deploy
   - Token War / Betting system design
   - Telegram bot development
   - Và tất cả trao đổi khác

---

## 14. Bước 12 — Facebook JSON (Phase 1A — Tải Riêng Trên Mac)

> **GHI CHÚ:** File JSON export từ Facebook của tác giả Nguyễn Thế Hoàng Linh (~15.000 bài viết) chưa được đưa vào migration package. User sẽ tải file này trực tiếp trên máy Mac.

### 14.1 Khi user đã có file JSON trên Mac

```bash
# Tạo thư mục chứa raw data
mkdir -p ~/Projects/baitapcuoikhoa/data/facebook-raw

# Copy/move file JSON vào đó
# (user sẽ chỉ cho agent biết path cụ thể)
mv ~/Downloads/facebook-*.json ~/Projects/baitapcuoikhoa/data/facebook-raw/
# hoặc nếu là ZIP:
# unzip ~/Downloads/facebook-data.zip -d ~/Projects/baitapcuoikhoa/data/facebook-raw/
```

### 14.2 Cấu trúc file JSON mong đợi (từ Facebook export)

```
facebook-data/
├── posts/
│   ├── your_posts_1.json    # ~5000 posts mỗi file
│   ├── your_posts_2.json
│   └── your_posts_3.json
└── photos_and_videos/
    └── ...
```

### 14.3 Xử lý Phase 1A

Sau khi có file JSON, agent sẽ thực hiện pipeline theo `CLAUDE.md` Section 4:
1. Parse UTF-8 (Facebook dùng escaped Unicode)
2. Extract: timestamp, text content, media URIs
3. Clean & Normalize (decode Unicode, giữ line breaks cho thơ)
4. AI Classification (GPT-4o-mini batch)
5. Deduplication
6. Generate metadata (slug, excerpt)
7. Author review
8. Import vào PostgreSQL qua Prisma

> **Chi tiết đầy đủ:** Xem `CLAUDE.md` > Section 4 (Phase 1A)

---

## 15. Troubleshooting

### Lỗi thường gặp trên Apple Silicon

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|----------|
| `prisma generate` thất bại | Thiếu binary cho `darwin-arm64` | Đảm bảo `binaryTargets` có `"darwin-arm64"` trong `schema.prisma` |
| `npm ci` lỗi native addons | Module C++ không tương thích ARM | Thử `npm rebuild` hoặc xóa `node_modules` rồi `npm ci` lại |
| Docker container không start | Docker Desktop chưa được mở | Mở Docker Desktop trước, chờ icon "running" |
| Port 5433 bị chiếm | PostgreSQL local đã chạy | `lsof -i :5433` để kiểm tra, `kill` process hoặc đổi port |
| Permission denied `/public/uploads/` | File permission macOS | `chmod -R 755 public/uploads/` |
| `next dev` báo lỗi module | `node_modules` cũ/xung đột | `rm -rf node_modules .next && npm ci` |

### Lỗi Database

| Lỗi | Cách fix |
|-----|----------|
| `db_backup.sql` import lỗi "relation already exists" | File dump dùng `--clean` nên sẽ DROP trước khi CREATE. Nếu vẫn lỗi: `docker exec vibe-db psql -U vibe_user -d vibe_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"` rồi import lại |
| Prisma migrate lỗi "migration already applied" | Bình thường nếu đã import dump có table `_prisma_migrations`. Chạy `npx prisma migrate resolve --applied <migration_name>` |
| Empty tables sau import | Kiểm tra file `db_backup.sql` có data hay chỉ có schema. Nếu chỉ có schema, export lại với `pg_dump` KHÔNG có flag `--schema-only` |

---

## 16. Tham Khảo: Thông Tin Môi Trường Windows Gốc

### Versions đã cài trên Windows

| Tool | Version |
|------|---------|
| Node.js | v24.13.0 |
| npm | 11.6.2 |
| Git | 2.51.2.windows.1 |
| Docker | (Docker Desktop for Windows) |
| OS | Windows |

### Database credentials (Dev local)

| Key | Value |
|-----|-------|
| DB User | `vibe_user` |
| DB Password | `vibe_pass` |
| DB Name | `vibe_db` |
| DB Host | `localhost` |
| DB Port | `5433` (mapped từ container port `5432`) |

### Docker Compose services

| Service | Container Name | Image | Port |
|---------|---------------|-------|------|
| `db` | `vibe-db` | `postgres:16-alpine` | `5433:5432` |
| `app` | `vibe-app` | `vibe-app:v3` | `3001:3000` |

### VPS Production Server

| Key | Value |
|-----|-------|
| IP | `188.166.177.93` |
| Port | `3001` |
| User | `root` |
| Deploy method | Git pull + Docker build |

### Prisma Migrations đã có

1. `20260227103043_init_postgres` — Schema khởi tạo PostgreSQL
2. `20260228000000_add_performance_indexes` — Thêm indexes tối ưu

### File `.env` structure

```
DATABASE_URL="postgresql://vibe_user:vibe_pass@localhost:5433/vibe_db"
OPENAI_API_KEY="sk-proj-..."
NEXTAUTH_SECRET="<64-char-random>"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@admin.com"
ADMIN_PASSWORD="admin"
```

---

## CHECKLIST TỔNG KẾT

Agent AI thực hiện xong khi tất cả các mục sau đều ✅:

- [ ] Homebrew đã cài
- [ ] Git đã cài và config user.name/email
- [ ] Node.js v24.x đã cài (qua nvm hoặc Homebrew)
- [ ] npm v11.x hoạt động
- [ ] Docker Desktop đã cài và đang chạy
- [ ] Repo đã clone thành công
- [ ] `prisma/schema.prisma` đã thêm `darwin-arm64` vào binaryTargets
- [ ] File `.env` đã tạo với đầy đủ variables (copy từ migration package)
- [ ] File `.env.local` đã tạo với OPENAI_API_KEY (copy từ migration package)
- [ ] PostgreSQL container (`vibe-db`) đang chạy healthy trên port 5433
- [ ] Database schema đã migrate (11 tables)
- [ ] Database data đã import từ file `db_backup.sql`
- [ ] Uploaded files đã copy vào `public/uploads/` (12 files)
- [ ] `npm ci` thành công (không lỗi)
- [ ] `npx prisma generate` thành công
- [ ] `npm run dev` chạy được, truy cập `http://localhost:3000` hiển thị trang chủ
- [ ] CMS dashboard (`/cms/dashboard`) truy cập được
- [ ] API `/api/genres` trả về JSON
- [ ] VS Code hoặc Cursor đã cài
- [ ] (Optional) Claude Code CLI đã cài và settings đã restore
- [ ] Antigravity workspace đã restore tại `~/.gemini/antigravity/` (35 conversations, brain data)
- [ ] (Sau) Facebook JSON đã tải và đặt vào `data/facebook-raw/`

---

> **Ghi chú cuối:** File này được tạo tự động bởi Antigravity AI Agent dựa trên phân tích workspace thực tế trên máy Windows. Mọi version numbers, file paths, env variables, và database credentials đều được lấy từ dữ liệu thật, không phải placeholder.
