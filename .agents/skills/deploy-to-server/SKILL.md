---
name: deploy-to-server
description: |
  Deploy ứng dụng Next.js + PostgreSQL/pgvector lên DigitalOcean server.
  Bao gồm: build Docker image (cross-platform) → push Docker Hub → export DB dump →
  compress media → upload → restore trên server → verify.
  Hỗ trợ: Mac M-series (ARM) build cho Linux AMD64 server.
---

# Deploy Next.js + PostgreSQL → DigitalOcean Server

## Mục tiêu cốt lõi
Deploy phiên bản mới nhất của ứng dụng Next.js (với PostgreSQL/pgvector) từ máy local
lên một VPS Linux (DigitalOcean/Linode/Vultr), bao gồm:
- **Code**: Build Docker image trên Mac (ARM) → push Docker Hub → pull trên server (AMD64)
- **Database**: Export full dump local → restore trên server (bảo toàn pgvector embeddings)
- **Media**: Nén local → upload → giải nén vào Docker volume trên server
- **Zero downtime**: Dữ liệu test cũ bị thay thế hoàn toàn bằng dữ liệu production

## Điều kiện tiên quyết

### Local (Mac)
- Docker Desktop đã cài, `docker buildx` sẵn sàng
- Tài khoản Docker Hub (ví dụ: `vietdungregister`)
- SSH access tới server (key-based hoặc password + `sshpass`)
- Project có `Dockerfile`, `docker-compose.yml`, `.dockerignore`

### Server (Linux VPS)
- Docker + Docker Compose đã cài
- Tối thiểu 2GB RAM (hoặc 1GB + 2GB swap)
- Disk: cần ≥ (DB dump + media compressed + media extracted + Docker images)
- Port 3001 mở (hoặc port bạn dùng)

## ⚠️ Các bẫy (pitfalls) đã rút kinh nghiệm

> **CRITICAL — Đọc trước khi làm. Mỗi mục dưới đây là một lỗi thực tế đã gặp.**

### 1. `.dockerignore` PHẢI exclude media/uploads
Nếu không, Docker build context sẽ transfer hàng GB → build cực chậm.
```
# .dockerignore — PHẢI CÓ các dòng này
/media/
/output/
/data/
/public/uploads/fb/
*.dump
*.tar.gz
```

### 2. `force-dynamic` chỉ dành cho Server Components
- **Server Components** (dùng Prisma trực tiếp): PHẢI có `export const dynamic = 'force-dynamic'`
  để Next.js không cố render lúc build (vì Dockerfile dùng dummy DATABASE_URL).
- **Client Components** (`'use client'`): KHÔNG ĐƯỢC có `export const dynamic` — sẽ gây lỗi compile.
- **Không được duplicate**: Kiểm tra trước khi thêm.

### 3. pgvector image
Server PHẢI dùng `pgvector/pgvector:pg16` — KHÔNG phải `postgres:16-alpine`.
Nếu dùng postgres thuần, sẽ không có `CREATE EXTENSION vector` → AI search hỏng hoàn toàn.

### 4. Disk planning
Tính trước disk cần thiết:
```
DB dump compressed     : ~1.1 GB
Media compressed       : ~2.5 GB
Media extracted        : ~5.0 GB  ← CẦN ĐỦ CHỖ!
Docker images          : ~2.0 GB
PostgreSQL data        : ~4.0 GB
OS + swap              : ~3.0 GB
────────────────────────────────────
TỔNG THAM KHẢO         : ~18 GB → cần disk ≥ 25GB
```

### 5. SSH key vs Password
Tool AI thường KHÔNG có SSH key trên server. Giải pháp:
- Dùng `sshpass` + password để thêm public key vào server
- Sau đó SSH bằng key bình thường

### 6. Build cho đúng architecture
Mac M-series (ARM) PHẢI build cho `linux/amd64` nếu server là x86:
```bash
docker buildx build --platform linux/amd64 ...
```
Nếu build không có `--platform`, image SẼ KHÔNG chạy được trên server.

### 7. Git: branch name
Kiểm tra branch name trước khi push — local có thể là `master` trong khi remote là `main` hoặc ngược lại.

### 8. Service name vs container_name trong docker-compose
`docker compose stop/up` dùng **service name** (key dưới `services:`), KHÔNG phải `container_name`.
Ví dụ:
```yaml
services:
  app:                        ← Đây là SERVICE NAME (dùng trong docker compose stop app)
    container_name: vibe-app  ← Đây chỉ là tên hiển thị khi docker ps
```
Nếu dùng nhầm `docker compose stop vibe-app` sẽ báo `no such service`.
Kiểm tra service name: `grep -B5 'container_name:' docker-compose.yml`

### 9. pgvector HNSW giới hạn 2000 dims
HNSW/IVFFlat index cho `vector` type bị giới hạn **tối đa 2000 dimensions**.
Nếu dùng `text-embedding-3-large` (3072d), phải cast sang **`halfvec(3072)`**:
```sql
-- ❌ Sẽ lỗi với 3072d
CREATE INDEX ... USING hnsw (embedding vector_cosine_ops);

-- ✅ Dùng halfvec — hỗ trợ đến 4000 dims
CREATE INDEX ... USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);
```
Và trong query cũng phải cast để index được dùng:
```sql
ORDER BY c.embedding::halfvec(3072) <=> $1::halfvec(3072)
```

## Quy trình thực thi (7 phases)

---

### Phase 1 — Chuẩn bị Schema & Code

**1.1 Kiểm tra pending migrations:**
```bash
npx prisma migrate status
```
Nếu schema đã thay đổi qua `prisma db push` (fields có trong DB nhưng chưa có migration file):
```bash
# Tạo migration file thủ công
mkdir -p prisma/migrations/YYYYMMDDHHMMSS_migration_name/
# Viết migration SQL (xem scripts/create-migration.sql.example)
# Mark là đã applied trên local
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_migration_name
```

**1.2 Kiểm tra tất cả Server Components có `force-dynamic`:**
```bash
# Tìm pages THIẾU force-dynamic nhưng dùng Prisma (Server Components)
find src/app -name "page.tsx" -exec grep -L "force-dynamic\|revalidate" {} \; \
  | xargs grep -l "prisma\|import.*db" 2>/dev/null
```
Thêm `export const dynamic = 'force-dynamic'` VÀO ĐẦU file (trước imports).

**QUAN TRỌNG**: KHÔNG thêm vào file có `'use client'`.

**1.3 Kiểm tra `.dockerignore`:**
Đảm bảo đã exclude các thư mục lớn. Xem mục "Các bẫy" ở trên.

---

### Phase 2 — Commit & Push GitHub

```bash
# Set git author (dùng account chủ project)
git config user.name "YOUR_NAME"
git config user.email "YOUR_EMAIL"

# Stage chỉ source code (KHÔNG media/output/dump)
git add .gitignore .dockerignore prisma/ src/ Dockerfile docker-compose.yml \
  next.config.ts package.json package-lock.json scripts/ .agents/

git commit -m "feat: description of changes

Co-authored-by: AI Agent <agent@example.com>"

# Push (nếu cần token)
git remote set-url origin https://TOKEN@github.com/USER/REPO.git
git push origin BRANCH
git remote set-url origin https://github.com/USER/REPO.git  # Xóa token khỏi URL
```

---

### Phase 3 — Build Docker Image Cross-Platform

```bash
docker buildx build \
  --platform linux/amd64 \
  -t DOCKERHUB_USER/IMAGE_NAME:TAG \
  --push \
  .
```

**Thời gian**: ~5-15 phút (tuỳ cache). Build context phải < 1MB nếu `.dockerignore` đúng.

**Nếu build failed** tại `npm run build`:
- Lỗi Prisma: do Server Component gọi DB lúc build → thêm `force-dynamic`
- Lỗi TypeScript: do `'use client'` page có `export const dynamic` → xóa đi
- Lỗi duplicate: kiểm tra `grep -c "export const dynamic" FILE`

---

### Phase 4 — Export Database Dump

```bash
# Export full PostgreSQL dump (custom format, nhanh + nén tốt)
docker exec CONTAINER_DB pg_dump -U DB_USER -d DB_NAME \
  --no-owner --no-privileges --clean --if-exists \
  -F custom -f /tmp/db.dump

# Copy ra local
docker cp CONTAINER_DB:/tmp/db.dump ./db.dump
```

**Size tham khảo**: 10K works + 133K vector chunks ≈ 1.1GB

---

### Phase 5 — Compress Media Uploads

```bash
tar czf uploads.tar.gz -C public/uploads .
```

**Size tham khảo**: ~2,000 ảnh + video ≈ 2.4GB

---

### Phase 6 — Upload & Deploy trên Server

**6.1 Đảm bảo SSH access:**
```bash
# Nếu chưa có SSH key trên server
brew install sshpass  # macOS
PUB_KEY=$(cat ~/.ssh/id_ed25519.pub)
sshpass -p 'PASSWORD' ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=no \
  root@SERVER_IP "mkdir -p ~/.ssh && echo '$PUB_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

**6.2 Upload files:**
```bash
rsync -avz --progress --partial db.dump root@SERVER_IP:~/
rsync -avz --progress --partial uploads.tar.gz root@SERVER_IP:~/
```

**6.3 Chạy deploy script trên server** (xem `scripts/server-deploy.sh`):
```bash
ssh root@SERVER_IP 'bash -s' < scripts/server-deploy.sh
```

Hoặc chạy từng bước thủ công:

```bash
ssh root@SERVER_IP << 'EOF'
# [1] Swap (2GB)
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

# [2] Update docker-compose.yml
cd /app  # hoặc project path trên server
sed -i 's|image: OLD_IMAGE|image: DOCKERHUB_USER/IMAGE:TAG|g' docker-compose.yml
sed -i 's|image: postgres:16-alpine|image: pgvector/pgvector:pg16|g' docker-compose.yml

# [3] Pull & restart
docker pull DOCKERHUB_USER/IMAGE:TAG
docker compose down && docker compose up -d
sleep 15

# [4] Restore DB
docker exec CONTAINER_DB psql -U DB_USER -d DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;"
docker cp ~/db.dump CONTAINER_DB:/tmp/db.dump
docker exec CONTAINER_DB pg_restore -U DB_USER -d DB_NAME \
  --clean --if-exists --no-owner --no-privileges /tmp/db.dump

# [5] Optimize PostgreSQL for 2GB RAM
docker exec CONTAINER_DB psql -U DB_USER -d DB_NAME -c "
  ALTER SYSTEM SET shared_buffers = '256MB';
  ALTER SYSTEM SET work_mem = '8MB';
  ALTER SYSTEM SET effective_cache_size = '1GB';
  SELECT pg_reload_conf();"

# [6] Restore media
UPLOAD_VOL=$(docker inspect CONTAINER_APP --format '{{ range .Mounts }}{{ if eq .Destination "/app/public/uploads" }}{{ .Source }}{{ end }}{{ end }}')
tar xzf ~/uploads.tar.gz -C "$UPLOAD_VOL"/

# [7] Cleanup
rm -f ~/db.dump ~/uploads.tar.gz
docker rmi OLD_IMAGES 2>/dev/null; docker image prune -f
EOF
```

---

### Phase 7 — Verify

```bash
ssh root@SERVER_IP << 'EOF'
# Data check
docker exec CONTAINER_DB psql -U DB_USER -d DB_NAME -c "
  SELECT 'works' AS e, COUNT(*) FROM \"Work\"
  UNION ALL SELECT 'chunks', COUNT(*) FROM \"ChatChunk\";"

# Web check
curl -s -o /dev/null -w "Homepage: HTTP %{http_code}\n" http://localhost:3001/
curl -s -o /dev/null -w "Works:    HTTP %{http_code}\n" http://localhost:3001/tac-pham

# AI Search check
curl -s -X POST http://localhost:3001/api/ai-search \
  -H "Content-Type: application/json" \
  -d '{"query":"test query"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'AI Search: {len(d.get(\"works\",[]))} results')"

# System health
docker ps
df -h /
free -h
EOF
```

## Variables cheat sheet

| Variable | Ví dụ hiện tại | Mô tả |
|---|---|---|
| `SERVER_IP` | `188.166.177.93` | IP của DigitalOcean droplet |
| `DOCKERHUB_USER` | `vietdungregister` | Docker Hub username |
| `IMAGE_NAME` | `nthl` | Tên Docker image |
| `TAG` | `v4` → `v5`, `v6`... | Tăng dần mỗi lần deploy |
| `CONTAINER_DB` | `vibe-db` | Tên container PostgreSQL |
| `CONTAINER_APP` | `vibe-app` | Tên container Next.js app |
| `DB_USER` | `vibe_user` | PostgreSQL username |
| `DB_NAME` | `vibe_db` | PostgreSQL database name |
| `PROJECT_PATH` | `/app` | Đường dẫn project trên server |
| `BRANCH` | `master` | Git branch name |

## Thời gian ước tính

| Phase | Thời gian |
|---|---|
| 1. Schema + force-dynamic | 5 phút |
| 2. Commit + Push | 2 phút |
| 3. Docker build (cross-platform, cached) | 5–15 phút |
| 4. Export DB dump | 3–5 phút |
| 5. Compress media | 2–3 phút |
| 6. Upload (tùy mạng) + Deploy | 10–30 phút |
| 7. Verify | 2 phút |
| **Tổng (lần đầu)** | **~45–60 phút** |
| **Lần sau (incremental, no media)** | **~15–20 phút** |

## Incremental Deploy (lần 2+, chỉ code change)

Nếu chỉ thay đổi code mà KHÔNG thay đổi DB hay media:

```bash
# Local
docker buildx build --platform linux/amd64 -t USER/IMAGE:vN --push .

# Server
ssh root@SERVER_IP '
  cd /app
  docker pull USER/IMAGE:vN
  sed -i "s|image: USER/IMAGE:v.*|image: USER/IMAGE:vN|g" docker-compose.yml
  docker compose down && docker compose up -d
'
```

Thời gian: **~5 phút**.

## SQL Migration trực tiếp trên Production

Khi chỉ cần chạy migration SQL (không redeploy toàn bộ), ví dụ tạo index:

```bash
# Chạy migration SQL trên production DB
ssh root@SERVER_IP "docker exec CONTAINER_DB psql -U DB_USER -d DB_NAME -c 'SQL_STATEMENT'"

# Hoặc chạy file SQL (copy lên server trước)
scp prisma/migrations/MIGRATION/migration.sql root@SERVER_IP:~/migration.sql
ssh root@SERVER_IP "docker exec -i CONTAINER_DB psql -U DB_USER -d DB_NAME < ~/migration.sql"
```

**Ví dụ thực tế — tạo HNSW index (chạy CONCURRENTLY để không block app):**
```bash
ssh root@SERVER_IP "docker exec CONTAINER_DB psql -U DB_USER -d DB_NAME -c \
  \"CREATE INDEX CONCURRENTLY IF NOT EXISTS \\\"ChatChunk_embedding_hnsw_idx\\\" \
  ON \\\"ChatChunk\\\" USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops) \
  WITH (m = 16, ef_construction = 64);\""
```

**Thời gian tạo HNSW index**: ~5-30 phút tuỳ số lượng rows và RAM.
Tăng memory cho nhanh hơn (nếu có quyền superuser):
```bash
ssh root@SERVER_IP "docker exec CONTAINER_DB psql -U DB_USER -d DB_NAME -c \"ALTER SYSTEM SET maintenance_work_mem = '512MB';\"" 
ssh root@SERVER_IP "docker exec CONTAINER_DB psql -U DB_USER -d DB_NAME -c \"SELECT pg_reload_conf();\""
```

**Verify index đã tạo thành công:**
```bash
ssh root@SERVER_IP "docker exec CONTAINER_DB psql -U DB_USER -d DB_NAME -c \
  \"SELECT c.relname, i.indisvalid FROM pg_index i \
  JOIN pg_class c ON c.oid=i.indexrelid \
  JOIN pg_class t ON t.oid=i.indrelid \
  WHERE t.relname='ChatChunk';\""
```

