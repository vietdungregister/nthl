# AI Context & Technical Overview
**Project Name:** Nguyễn Thế Hoàng Linh Archive Web App (baitapcuoikhoa)
**Last Updated:** March 2026

This document serves as a compact overview of the current project state, designed for future agentic AIs to quickly understand the architecture, tech stack, and recent implementations.

## 1. Tech Stack
- **Framework:** Next.js 16.1.6 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Database:** PostgreSQL (via Docker Compose), Prisma ORM v6.19.2
- **Auth:** NextAuth.js v5 (beta) (used for CMS admin route protection)
- **Key Dependencies:** TipTap (rich text for poetry), OpenAI (for AI chat features), Zod (validation), Date-fns.

## 2. Core Entities & Database
- `Work`: The primary entity representing poems, prose, novels, videos, etc. Optimized with PostgreSQL Full-Text Search (FTS) via GIN indexing (`Work_fts_gin_idx`).
- `Genre`, `Tag`, `Collection`: Dynamic classifications used across the CMS and public site.
- `Book`: Published physical books entity (`/sach`).
- `AuthorProfile`: Singleton record for the author's bio, avatar, and social links.
- `AdminUser`: CMS login with rate limiting & account lockout mechanisms.
- `Comment`, `Media`.

## 3. Project Architecture & Routing
- **Public Site (`/`):**
  - **Layout:** Uses a shared responsive layout (`src/app/(public)/layout.tsx`) that includes a hamburger menu and contextual sidebars.
  - **Routes & Structure:** Features a nested routing strategy (`/`, `/tac-pham`, `/sach`, `/tim-kiem`, `/gioi-thieu`, `/bo-suu-tap`).
  - **Performance:** Relies heavily on `unstable_cache` in `src/lib/cache.ts` for Genres, Tags, and Author data. List view queries exclude heavy `content` fields to avoid memory bloat.
- **CMS (`/cms`):**
  - Protected via NextAuth wrapper.
  - Features a TipTap rich text editor that preserves critical line-breaks formatting for poetry.
  - Complete CRUD for works, collections, tags, genres, media, and books.
- **AI Features:**
  - AI Librarian feature (`/tim-kiem` or `/ai-chat`) to query the archive.
  - API rate-limited and context-controlled to prevent massive token burns.

## 4. Operational & Development Rules
- **Database queries (`Work`):** DO NOT use `findMany` on `Work` without targeted `select` statements to avoid loading GBs of content.
- **Searching:** DO NOT use Prisma `contains` for text search. Always utilize the FTS `tsvector` raw queries for performance.
- **Data Mutation:** Always call `revalidateTag(...)` from `next/cache` when CMS entities (Genres, Tags, Author) are updated to clear the public cache.
- **Local Dev:** Run `docker-compose up -d` to boot PostgreSQL before running `npm run dev`.

## 5. Recent Major Changes (Feb-Mar 2026)
- **Database Migration:** Successfully migrated from SQLite (`dev.db` legacy) to containerized PostgreSQL.
- **Security Audit Resolutions:** Enforced API pagination limits, rotated exposed database secrets, and implemented login attempt lockouts for `AdminUser`.
- **UI & Architecture:** Refactored the public application to use a unified `(public)` route group layout. Made genres fully dynamic (driven from DB) instead of hardcoded strings. Implemented a Daily Work Banner modal with permanent opt-out handling.
