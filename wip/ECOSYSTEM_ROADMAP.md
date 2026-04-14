# ECOSYSTEM_ROADMAP.md — Tầm Nhìn Hệ Sinh Thái & Kiến Trúc Mở Rộng

# Nền Tảng Văn Học Số: Nguyễn Thế Hoàng Linh

> **Phiên bản:** 2.0 (mở rộng từ CLAUDE.md v1.0)
> **Ngày tạo:** 2026-03-26
> **Bối cảnh:** Tài liệu này bổ sung cho CLAUDE.md (PRD v1.0), ghi lại tầm nhìn hệ sinh thái đầy đủ, kiến trúc 3 phase, phân tích chi phí AI, và các quyết định kỹ thuật đã thống nhất.

---

## 1. Tầm Nhìn Tổng Thể (Từ Tác Giả)

### 1.1 Nguyên văn yêu cầu tác giả

> "Dùng mấy con AI để bọn nó vận hành content mở rộng kiểu chơi Minecraft. Rồi làm mấy con robot đọc thơ, nối thơ, làm 1 con thơ máy."

> "Chắc bán chạy. Nhất là để dạy ngôn ngữ cho trẻ nhỏ. Vừa học vừa chơi phát triển nhanh."

> "Mình sẽ đính Chat GPT vào cho nó tạo tự động bản dịch các thứ tiếng. Anh cũng có quyền hiệu đính các bản dịch và xác nhận vào bản đã hài lòng."

> "Độc giả có thể đóng góp bản dịch, thảo luận."

> "Mình cũng có thể bán gói giải pháp hay con AI này cho các tác giả."

### 1.2 Tóm tắt tầm nhìn

Xây dựng một **hệ sinh thái văn học số** với core là kho 15.000+ tác phẩm trên Facebook, mở rộng ra:

1. **Web app** — đọc, search, AI chat với kho tác phẩm
2. **Dịch thuật đa ngôn ngữ** — AI dịch + tác giả hiệu đính + cộng đồng đóng góp
3. **AI sáng tạo** — robot đọc thơ, nối thơ, thơ máy, dạy ngôn ngữ trẻ em
4. **Đa nền tảng** — Facebook, Instagram, Threads, YouTube, Spotify, Apple Music
5. **SaaS** — đóng gói bán giải pháp cho các tác giả khác

### 1.3 Đội ngũ (đã xác nhận)

- **Tác giả:** Nguyễn Thế Hoàng Linh — content owner, hiệu đính
- **Dev chính:** Dung — code, kiến trúc, triển khai
- **Hỗ trợ:** 2 Hưng (code + giám sát), Tuấn (tư vấn hệ sinh thái)
- **AI:** Claude Code + Antigravity — hỗ trợ phát triển

---

## 2. Kiến Trúc Tổng Thể (3 Phase)

### 2.1 Sơ đồ kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                    NGUỒN DỮ LIỆU                            │
│  Facebook JSON (15k bài) · CMS nhập tay · Fanpage API      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              POSTGRESQL + PGVECTOR                            │
│  15k+ tác phẩm · full-text search · vector embeddings       │
│  (Core DB — dùng chung cho tất cả phase)                     │
└──────────┬──────────────────────────────┬───────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐    ┌──────────────────────────────────┐
│   NEXT.JS WEB APP   │    │        AI SERVICE LAYER          │
│  CMS + Public site  │    │  RAG search + Chat               │
│  SEO + SSR          │    │  (→ Phase 2: Translation)        │
└─────────────────────┘    │  (→ Phase 3: Fine-tuned model)   │
                           └──────────────┬───────────────────┘
                                          │
                                          ▼
                           ┌──────────────────────────────────┐
                           │     LLM API (thay đổi được)      │
                           │  GPT · Gemini · Claude · Custom  │
                           └──────────────────────────────────┘
```

### 2.2 Nguyên tắc kiến trúc

1. **PostgreSQL + pgvector ở trung tâm** — single source of truth cho tất cả phase
2. **AI service layer tách riêng** — thay đổi LLM provider không ảnh hưởng web app
3. **Mở rộng bằng cách "cắm thêm"** — không đập đi xây lại
4. **Model-agnostic** — không lock-in vào OpenAI hay bất kỳ provider nào

---

## 3. Phase 1 — Nền Tảng Core (Ưu tiên cao nhất)

### 3.1 Thu thập dữ liệu từ Facebook

**Vấn đề:** Tác giả có ~15.000 bài trên Facebook cá nhân. Data từ Facebook Download (JSON) bị lộn xộn, text dính vào nhau.

**Giải pháp:**

1. Tác giả tải file JSON từ Facebook (Settings → Download Your Information → Posts → JSON format)
2. Script tự động parse + làm sạch:
   - Tách từng bài thành record riêng
   - Giữ nguyên line breaks (quan trọng cho thơ)
   - Trích xuất: tiêu đề (nếu có), nội dung, ngày đăng, media URLs
   - Loại bỏ metadata không cần (reactions, comments, shares)
3. AI hỗ trợ phân loại tự động: thơ / văn xuôi / tiểu luận / status ngắn
4. Import vào PostgreSQL qua Prisma seed script

**Cập nhật bài mới (sau import ban đầu):**

- **Phương án A (khuyến nghị):** Tác giả nhập bài mới qua CMS (đã có sẵn)
- **Phương án B:** Tạo Facebook Fanpage, post song song → Graph API tự sync (API chỉ hỗ trợ Page, không hỗ trợ profile cá nhân)
- **Phương án C:** Định kỳ tải lại JSON từ Facebook, script detect bài mới

### 3.2 RAG Search + AI Chat

**Kiến trúc RAG:**

```
User hỏi: "Anh Linh có bài thơ nào về mùa thu?"
    │
    ▼
[1] Embed câu hỏi → vector (OpenAI embedding API)
    │
    ▼
[2] pgvector similarity search → tìm 5 bài liên quan nhất
    │
    ▼
[3] Gửi 5 bài + câu hỏi cho LLM: "Dựa trên các tác phẩm sau, hãy trả lời..."
    │
    ▼
[4] LLM trả lời có trích dẫn thật từ tác phẩm
```

**Cần thêm vào codebase hiện tại:**

1. **pgvector extension** — cài trên PostgreSQL hiện có
2. **Bảng mới trong Prisma schema:**

```prisma
model WorkEmbedding {
  id        String @id @default(uuid())
  workId    String
  work      Work   @relation(fields: [workId], references: [id])
  chunk     String // đoạn text được embed
  chunkIdx  Int    // thứ tự chunk trong bài
  embedding Unsupported("vector(1536)") // OpenAI embedding dimension
  
  @@index([embedding], type: Hnsw(ops: VectorCosineOps))
}
```

3. **Chunking pipeline:**
   - Thơ ngắn (< 500 từ): embed nguyên bài
   - Văn xuôi dài: chunk ~500 từ, overlap 100 từ
   - Giữ metadata (title, genre, date) trong mỗi chunk

4. **API endpoint:** `/api/ai-chat` (đã có rate limiting sẵn)
5. **Chat UI component** trên public site

**Lưu ý quan trọng (từ CLAUDE.md):**
- ❌ KHÔNG load toàn bộ content vào LLM context
- ❌ KHÔNG query `SELECT content FROM Work` trên nhiều rows cùng lúc
- ✅ Dùng pgvector tìm relevant chunks trước, chỉ gửi chunks đó cho LLM

### 3.3 Chi phí AI — Phase 1

#### Embedding (chạy 1 lần + mỗi bài mới)

15.000 bài × ~500 từ/bài = ~7.5 triệu từ = ~10 triệu tokens

| Provider | Model | Giá embed toàn bộ kho | Chất lượng |
|---|---|---|---|
| OpenAI | text-embedding-3-small | ~$0.20 (≈ 5k VNĐ) | Tốt |
| OpenAI | text-embedding-3-large | ~$1.30 (≈ 33k VNĐ) | Rất tốt |
| Google | text-embedding-004 | Miễn phí (dưới quota) | Tốt |

**→ Gần như không đáng kể.**

#### Chat (mỗi lần user hỏi)

Mỗi câu hỏi ≈ 2.000-4.000 tokens (câu hỏi + 3-5 chunks context + trả lời)

| Provider | Model | Giá/lượt chat | Chất lượng tiếng Việt |
|---|---|---|---|
| OpenAI | gpt-4o-mini | ~300-600 VNĐ | Tốt |
| OpenAI | gpt-4o | ~3.000-6.000 VNĐ | Rất tốt |
| Anthropic | Claude Sonnet | ~2.000-4.000 VNĐ | Rất tốt |
| Google | Gemini 2.0 Flash | Rẻ hơn GPT-4o ~3x | Tốt |

**Ước tính hàng tháng:**

| Scenario | Lượt chat/tháng | Model | Chi phí/tháng |
|---|---|---|---|
| Khởi đầu | 1.000 | gpt-4o-mini | ~300k-600k VNĐ |
| Trung bình | 10.000 | gpt-4o-mini | ~3-6 triệu VNĐ |
| Cao | 10.000 | gpt-4o | ~30-60 triệu VNĐ |

**Đề xuất combo tiết kiệm:**
- Embedding: OpenAI text-embedding-3-small
- Chat: gpt-4o-mini (mặc định) + gpt-4o (câu hỏi phức tạp)
- Rate limit: 10 câu/user/ngày (đã có sẵn trong code)

---

## 4. Phase 2 — Dịch Thuật & Cộng Đồng

### 4.1 AI Translation Engine

**Flow:**

```
Tác phẩm gốc (tiếng Việt)
    │
    ▼
AI dịch tự động → bản dịch nháp (EN, JP, FR, ZH, KO...)
    │
    ▼
Tác giả hiệu đính → xác nhận bản dịch chính thức
    │
    ▼
Published translation (đánh dấu "tác giả đã duyệt")
```

**Cần thêm:**

```prisma
model Translation {
  id          String @id @default(uuid())
  workId      String
  work        Work   @relation(fields: [workId], references: [id])
  language    String // "en", "ja", "fr", "zh", "ko"
  content     String
  translator  String // "ai", "community", "author"
  status      TranslationStatus // draft | reviewed | approved
  approvedBy  String? // null hoặc "author"
  approvedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CommunityTranslation {
  id              String @id @default(uuid())
  translationId   String? // null = bản dịch mới, có giá trị = góp ý cho bản dịch có sẵn
  workId          String
  work            Work   @relation(fields: [workId], references: [id])
  language        String
  content         String
  contributorName String
  contributorEmail String?
  status          String // pending | approved | rejected
  createdAt       DateTime @default(now())
}
```

**LLM prompt cho dịch thơ:**
- "Dịch không cần vần" (theo yêu cầu tác giả)
- Giữ line breaks chính xác
- Giữ hình ảnh, cảm xúc, không giải thích thêm

### 4.2 Community Features

- Đăng ký tài khoản độc giả (OAuth: Google, Facebook)
- Đóng góp bản dịch (moderated — tác giả duyệt)
- Thảo luận dưới tác phẩm (comment system)
- Voting/ranking bản dịch hay nhất

**Giá trị giáo dục (tác giả nhấn mạnh):**
> "Tạo nên một kênh học nhiều thứ tiếng, lại đạt độ khó cao nhất của dịch thuật. Đọc dịch thơ của Chat GPT và cộng đồng xong thi IELTS toàn 8.0"

---

## 5. Phase 3 — AI Sáng Tạo "Kiểu Minecraft"

### 5.1 Tổng quan

**Ý tưởng cốt lõi:** AI không chỉ tìm kiếm mà còn **tạo ra** content mới, mở rộng liên tục như gameplay Minecraft — mỗi ngày có thêm nội dung mới, tương tác mới.

### 5.2 Fine-tuning Poetry Model

**Mục đích:** Train model viết thơ/văn theo phong cách Nguyễn Thế Hoàng Linh.

**KHÔNG cần OpenClaw** — OpenClaw là AI assistant cá nhân (quản lý email, calendar, chat), không phải platform fine-tuning.

**Các lựa chọn fine-tuning:**

| Platform | Chi phí | Độ khó | Kiểm soát |
|---|---|---|---|
| OpenAI Fine-tuning API | $20-100/lần train | Dễ nhất | Thấp |
| Replicate / Modal | $20-200/lần | Trung bình | Trung bình |
| Self-host (Llama/Mistral trên GPU) | $50-500/tháng server | Cao | Cao nhất |

**Quy trình:**

1. Chuẩn bị dataset: 15.000 bài → format JSONL (prompt/completion pairs)
2. Train model trên data tác giả
3. Đánh giá: cho tác giả đọc output, chấm điểm
4. Iterate: điều chỉnh prompt, thêm data, train lại
5. Deploy: model mới cắm vào cùng AI service layer (thay endpoint, không đổi code)

### 5.3 Sản phẩm AI

#### Robot Đọc Thơ (Text-to-Speech)
- Dùng TTS API: ElevenLabs (giọng đọc tự nhiên nhất), Google TTS, hoặc Azure Speech
- Input: text tác phẩm từ DB
- Output: audio file (MP3) → publish lên Spotify, Apple Music, YouTube
- Có thể customize giọng đọc cho phù hợp thể loại (thơ thiếu nhi vs thơ người lớn)

#### Nối Thơ (Interactive Game)
- AI bắt đầu với 1 câu thơ → user nối tiếp → AI nối tiếp → ...
- Fine-tuned model đảm bảo phong cách nhất quán
- Gamification: điểm, ranking, challenges
- Có thể chơi solo hoặc multiplayer

#### Thơ Máy (AI Poetry Generator)
- User nhập chủ đề/cảm xúc → AI sinh thơ mới theo phong cách tác giả
- Tác giả có quyền duyệt, hiệu đính, publish
- "Mỗi ngày AI tạo 1 bài thơ mới" → auto-expand content library

#### Dạy Ngôn Ngữ Cho Trẻ
- Thơ thiếu nhi (Ra vườn nhặt nắng, Bé tập tô) làm giáo cụ
- Interactive: đọc thơ → quiz từ vựng → AI giải thích
- Đa ngôn ngữ: học tiếng Anh/Nhật/... qua thơ dịch
- "Vừa học vừa chơi phát triển nhanh" (yêu cầu tác giả)

### 5.4 Content Expansion "Kiểu Minecraft"

**Concept:** AI tự vận hành, content tự mở rộng:

```
Kho tác phẩm gốc (15k bài)
    │
    ├─→ AI dịch → 15k × N ngôn ngữ = hàng trăm ngàn bài dịch
    ├─→ AI sinh thơ mới → +365 bài/năm (tối thiểu)
    ├─→ AI tạo audio → podcast thơ tự động
    ├─→ Community đóng góp → bản dịch, thảo luận, nối thơ
    └─→ Cross-platform auto-publish → FB, Insta, YouTube, Spotify...
```

Mỗi layer mở rộng tạo thêm content mới mà KHÔNG cần tác giả phải ngồi viết thêm.

---

## 6. Đa Nền Tảng & Monetization

### 6.1 Kênh phân phối

| Nền tảng | Content | Mục đích |
|---|---|---|
| Web app (chính) | Tất cả tác phẩm + AI chat | Hub trung tâm, SEO |
| Facebook | Post mới, teaser | Traffic + engagement |
| Instagram | Quote cards, ảnh thơ | Viral, visual |
| Threads | Thơ ngắn, thoughts | Engagement |
| YouTube | Robot đọc thơ (video) | Revenue (ads) |
| Spotify | Robot đọc thơ (audio) | Revenue (streams) |
| Apple Music | Robot đọc thơ (audio) | Revenue (streams) |

### 6.2 Monetization (tiềm năng)

1. **Streaming revenue** — audio thơ trên Spotify/Apple Music
2. **YouTube ads** — video đọc thơ
3. **SaaS** — bán giải pháp "thư viện văn học AI" cho tác giả khác
4. **Education** — subscription dạy ngôn ngữ qua thơ
5. **Merch/Sách** — xuất PDF/sách từ DB (đã format sạch)

---

## 7. Quyết Định Kỹ Thuật Đã Thống Nhất

### 7.1 Không cần OpenClaw

OpenClaw là AI personal assistant (quản lý email, calendar, tự động hóa cá nhân). Dự án này cần:
- **Fine-tuning platform** (OpenAI API / Replicate) — cho Phase 3
- **RAG pipeline** (pgvector + LLM API) — cho Phase 1
- **Cron jobs / n8n** (nếu cần auto-publish) — đơn giản hơn OpenClaw

### 7.2 Không cần training cho Phase 1

RAG (Retrieval-Augmented Generation) KHÔNG cần training:
- AI vẫn là GPT/Claude gốc
- Chỉ "cho đọc" tác phẩm liên quan rồi trả lời
- Khi có bài mới → embed thêm vào pgvector → AI tự biết

Training (fine-tuning) chỉ cần ở Phase 3 khi muốn AI **viết giống** tác giả.

### 7.3 Tech stack (giữ nguyên + mở rộng)

**Giữ nguyên từ v1.0:**
- Next.js 16 + TypeScript + Prisma + PostgreSQL
- Tailwind CSS + shadcn/ui
- Docker + VPS (188.166.177.93:3001)
- TipTap editor, NextAuth.js

**Thêm mới:**
- `pgvector` extension cho PostgreSQL
- OpenAI embedding API (hoặc Google)
- LLM chat API (gpt-4o-mini mặc định, có thể switch)
- (Phase 2) Translation tables trong schema
- (Phase 3) Fine-tuning pipeline, TTS API

### 7.4 Budget

Có budget cho giải pháp chất lượng. Chi phí ước tính:

| Hạng mục | Chi phí/tháng | Ghi chú |
|---|---|---|
| VPS hosting | ~$20-50 | DigitalOcean droplet hiện tại |
| AI embedding | ~0 | Chạy 1 lần, gần miễn phí |
| AI chat (Phase 1) | $10-50 | Tuỳ traffic, gpt-4o-mini |
| AI translation (Phase 2) | $20-100 | Tuỳ số bài dịch |
| Fine-tuning (Phase 3) | $20-100 | Mỗi lần train |
| TTS audio (Phase 3) | $20-50 | ElevenLabs hoặc tương đương |

---

## 8. Việc Cần Làm Ngay

### 8.1 Tác giả cần làm

- [ ] Tải file JSON từ Facebook (Settings → Download Your Information → Posts → JSON → All time)
- [ ] Quyết định có tạo Fanpage không (để auto-sync bài mới)
- [ ] Gửi file JSON cho dev team

### 8.2 Dev cần làm (khi có file JSON)

- [ ] Viết script parse Facebook JSON → clean data
- [ ] Demo kết quả ~50 bài cho tác giả duyệt
- [ ] Import toàn bộ 15.000 bài vào PostgreSQL
- [ ] Cài pgvector, chạy embedding pipeline
- [ ] Xây AI chat UI + API endpoint
- [ ] Test end-to-end: user hỏi → AI trả lời đúng tác phẩm

### 8.3 Khi nào họp nhóm

Khi Phase 1 hoàn thành (web app + AI chat chạy ổn), gọi nhóm (2 Hưng + Tuấn) để:
- Demo sản phẩm
- Align roadmap Phase 2-3
- Phân công: ai phụ trách gì
- Bàn monetization strategy

---

## 9. Files Quan Trọng Trong Repo

| File | Vai trò |
|---|---|
| `CLAUDE.md` | PRD v1.0 — product requirements, data model, tech decisions |
| `ECOSYSTEM_ROADMAP.md` | **(file này)** — tầm nhìn mở rộng, 3 phase, chi phí AI |
| `src/lib/cache.ts` | Centralized cache cho genres/tags/author |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/auth.ts` | NextAuth JWT config |
| `prisma/schema.prisma` | Database schema (cần thêm WorkEmbedding, Translation) |

---

*Tài liệu này là living document. Cập nhật khi có quyết định mới.*
