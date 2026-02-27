# ============================================================
# Dockerfile — Next.js Literary Archive App  v3 (Optimized)
# Build strategy: Multi-stage (builder → runner)
# Base image: node:20-slim
# Output mode: standalone (next.config.ts)
# Database: PostgreSQL (via docker-compose)
#
# OPTIMIZATION SUMMARY:
#   - npm cache cleared trong builder (--prefer-offline + npm cache clean)
#   - apt cache xóa sau khi install (rm -rf /var/lib/apt/lists/*)
#   - Runner chỉ copy 4 folder nhỏ từ standalone output (KHÔNG copy node_modules)
#   - addgroup + adduser gộp 1 RUN để giảm layer
#   - ENV build-time dùng ARG → không bị leak vào final image layer
# ============================================================


# ───────────────────────────────────────────────────────────
# STAGE 1: builder
# Cài dependencies, generate Prisma Client, build Next.js
# Đây là stage nặng (~1.5GB), sẽ bị loại bỏ hoàn toàn
# khỏi final image nhờ multi-stage build.
# ───────────────────────────────────────────────────────────
FROM node:20-slim AS builder

# Cài openssl (cần cho Prisma) và dọn apt cache ngay trong cùng 1 RUN
# Gộp vào 1 layer để Docker không lưu cache apt riêng
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifest trước — tận dụng Docker layer cache:
# Nếu package.json không đổi, Docker skip bước npm ci
COPY package.json package-lock.json ./

# Cài ALL deps (kể cả devDeps: TypeScript, Tailwind, etc.)
# --prefer-offline: dùng cache local trước khi kéo từ registry
# && npm cache clean --force: xóa cache sau khi cài xong → tiết kiệm layer space
RUN npm ci --prefer-offline \
    && npm cache clean --force

# Copy source code SAU khi npm ci để tận dụng cache tối đa
COPY . .

# Generate Prisma Client cho cả native (dev) và debian-openssl-1.1.x (Docker linux)
RUN npx prisma generate

# ARG (build-time only) — an toàn hơn ENV vì KHÔNG bị ghi vào layer history
# Chỉ dùng để Next.js không crash khi import module lúc build
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy_db"
ARG NEXTAUTH_SECRET="build-time-dummy"
ARG NEXTAUTH_URL="http://localhost:3000"
ARG OPENAI_API_KEY="sk-build-dummy"
ARG NEXT_TELEMETRY_DISABLED=1

# Build → .next/standalone/ (server tự cung tự cấp, không cần node_modules đầy đủ)
RUN NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=$DATABASE_URL \
    NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
    NEXTAUTH_URL=$NEXTAUTH_URL \
    OPENAI_API_KEY=$OPENAI_API_KEY \
    npm run build


# ───────────────────────────────────────────────────────────
# STAGE 2: runner  ← FINAL IMAGE (production)
# Chỉ chứa runtime artifacts — không có source code,
# không có devDependencies, không có npm cache.
#
# Với output: 'standalone', Next.js đã bundle node_modules
# cần thiết vào .next/standalone/node_modules (tree-shaken).
# Runner KHÔNG cần copy toàn bộ node_modules!
# ───────────────────────────────────────────────────────────
FROM node:20-slim AS runner

# Cài openssl cho Prisma runtime (cần khi query DB) + dọn cache
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Gộp addgroup + adduser vào 1 RUN = 1 layer thay vì 2
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# ── Chỉ copy 4 thứ cần thiết từ builder ──────────────────

# 1. Standalone server bundle:
#    Bao gồm server.js + node_modules đã được tree-shaken (~50-100MB)
#    KHÔNG phải full node_modules (~500MB)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 2. Static assets (JS chunks, CSS — client-side)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 3. Public folder (favicon, robots.txt, hình ảnh tĩnh)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 4. Prisma binary cho PostgreSQL (linux-openssl-1.1.x)
#    Cần để Prisma Client chạy được trong container
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# ── KHÔNG copy những thứ sau ─────────────────────────────
# ✗ node_modules/         (standalone đã có đủ deps cần thiết)
# ✗ src/                  (source code không cần cho runtime)
# ✗ prisma/seed*.{js,cjs} (chỉ dùng khi setup, không cần runtime)
# ✗ .env                  (inject qua docker-compose environment)
# ─────────────────────────────────────────────────────────

USER nextjs

# Runtime ENV — an toàn, không phải secrets
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Khởi động standalone server — không cần npm, không cần next CLI
CMD ["node", "server.js"]
