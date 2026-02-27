import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/db'

// ---- Rate Limiter ---------------------------------------------------
const WINDOW_MS = 60 * 60 * 1000   // 1 giờ
const MAX_PER_IP = 10               // tối đa 10 req/giờ per IP
const MAX_GLOBAL = 200              // tối đa 200 req/giờ toàn hệ thống

interface RateEntry { count: number; resetAt: number }
const ipMap = new Map<string, RateEntry>()
let globalEntry: RateEntry = { count: 0, resetAt: Date.now() + WINDOW_MS }

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now()

    // Reset global nếu hết window
    if (now > globalEntry.resetAt) globalEntry = { count: 0, resetAt: now + WINDOW_MS }
    if (globalEntry.count >= MAX_GLOBAL) {
        return { allowed: false, retryAfterSec: Math.ceil((globalEntry.resetAt - now) / 1000) }
    }

    // Dọn entries cũ (chạy 1% thời gian để không block)
    if (Math.random() < 0.01) {
        for (const [k, v] of ipMap) { if (now > v.resetAt) ipMap.delete(k) }
    }

    const entry = ipMap.get(ip)
    if (!entry || now > entry.resetAt) {
        ipMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
        globalEntry.count++
        return { allowed: true, retryAfterSec: 0 }
    }
    if (entry.count >= MAX_PER_IP) {
        return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) }
    }
    entry.count++
    globalEntry.count++
    return { allowed: true, retryAfterSec: 0 }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })


// ---- Tool Definition ------------------------------------------------
const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'search_works',
            description:
                'Tìm kiếm tác phẩm trong thư viện theo từ khóa, thể loại và tag. ' +
                'Trả về danh sách tác phẩm phù hợp nhất.',
            parameters: {
                type: 'object',
                properties: {
                    keywords: {
                        type: 'string',
                        description:
                            'Từ khóa tìm kiếm trong tiêu đề, nội dung hoặc trích đoạn. ' +
                            'Có thể để trống nếu chỉ lọc theo thể loại hoặc tag.',
                    },
                    genre: {
                        type: 'string',
                        enum: ['poem', 'novel', 'essay', 'prose', 'painting', 'photo', 'video'],
                        description:
                            'Thể loại tác phẩm. poem=Thơ, novel=Tiểu thuyết, essay=Tiểu luận, ' +
                            'prose=Tùy bút, painting=Tranh, photo=Ảnh, video=Video.',
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Danh sách tên tag để lọc thêm (ví dụ: ["tình yêu", "mùa đông"]).',
                    },
                    limit: {
                        type: 'number',
                        description: 'Số lượng tác phẩm trả về, tối đa 10. Mặc định 5.',
                    },
                },
                required: [],
            },
        },
    },
]

// ---- Tool Executor --------------------------------------------------
async function executeSearchWorks(args: {
    keywords?: string
    genre?: string
    tags?: string[]
    limit?: number
}) {
    const { keywords, genre, tags, limit = 5 } = args
    const take = Math.min(limit, 10)

    const where: Record<string, unknown> = {
        status: 'published',
        deletedAt: null,
    }

    if (genre) where.genre = genre

    if (tags && tags.length > 0) {
        where.tags = { some: { tag: { name: { in: tags } } } }
    }

    if (keywords && keywords.trim()) {
        where.OR = [
            { title: { contains: keywords } },
            { content: { contains: keywords } },
            { excerpt: { contains: keywords } },
        ]
    }

    const works = await prisma.work.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take,
        select: {
            id: true,
            title: true,
            slug: true,
            genre: true,
            excerpt: true,
            content: true,
            publishedAt: true,
            tags: { select: { tag: { select: { name: true } } } },
        },
    })

    return works.map(w => ({
        id: w.id,
        title: w.title,
        slug: w.slug,
        genre: w.genre,
        excerpt: w.excerpt || w.content.slice(0, 600),
        content_preview: w.content.slice(0, 600),
        tags: w.tags.map((wt: { tag: { name: string } }) => wt.tag.name),
        publishedAt: w.publishedAt,
    }))
}

// ---- System Prompt --------------------------------------------------
const SYSTEM_PROMPT = `Bạn là Thủ Thư AI của thư viện tác phẩm Nguyễn Thế Hoàng Linh — một nhà thơ người Hà Nội sinh năm 1982, tác giả của hơn 1.000 tác phẩm thơ, tiểu thuyết, tùy bút và tiểu luận. Bài thơ "Bắt nạt" của ông được đưa vào sách giáo khoa Ngữ văn lớp 6.

Nhiệm vụ của bạn:
1. Hiểu nguyện vọng của độc giả — họ đang tìm kiếm cảm xúc, chủ đề, hoặc loại tác phẩm gì.
2. Dùng công cụ search_works để tìm những tác phẩm phù hợp nhất.
3. Đọc nội dung (content_preview/excerpt) của từng tác phẩm tìm được và phân tích.
4. Trả lời bằng giọng văn của một người thủ thư am hiểu — thân thiện, nhẹ nhàng, có chút văn chương.

Quy tắc:
- Luôn gọi search_works ít nhất một lần trước khi trả lời.
- Nếu tìm được tác phẩm: Viết 1-2 câu giới thiệu chung, sau đó với MỖI tác phẩm hãy viết 1-2 câu nhận xét riêng — nêu chủ đề, cảm xúc, hình ảnh đặc trưng hoặc lý do tác phẩm đó phù hợp với yêu cầu của độc giả. Dùng tên tác phẩm để dẫn vào nhận xét.
- Nếu không tìm được gì, hãy thành thật nói và gợi ý độc giả thử tìm với từ khóa khác.
- Trả lời hoàn toàn bằng tiếng Việt.
- Giọng điệu: ấm áp, như người bạn văn chương hiểu sâu tác phẩm, không phải chatbot lạnh lùng.
- Độ dài: vừa đủ để phân tích từng tác phẩm, không cần ngắn gọn cứng nhắc.`

// ---- Route Handler --------------------------------------------------
export async function POST(request: NextRequest) {
    try {
        // Lấy IP thật của client (qua proxy/Vercel headers)
        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1'

        const { allowed, retryAfterSec } = checkRateLimit(ip)
        if (!allowed) {
            const minutes = Math.ceil(retryAfterSec / 60)
            return NextResponse.json(
                { error: `Bạn đã hỏi quá nhiều lần. Thử lại sau khoảng ${minutes} phút nhé.` },
                { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
            )
        }

        const { query } = await request.json()

        if (!query || typeof query !== 'string' || !query.trim()) {
            return NextResponse.json({ error: 'Câu hỏi không được để trống.' }, { status: 400 })
        }

        if (query.length > 500) {
            return NextResponse.json({ error: 'Câu hỏi quá dài.' }, { status: 400 })
        }

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: query.trim() },
        ]

        // First call: AI decides which tool to call
        const firstResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            tools: TOOLS,
            tool_choice: 'auto',
            temperature: 0.7,
            max_tokens: 800,
        })

        const firstChoice = firstResponse.choices[0]
        const assistantMessage = firstChoice.message

        // Execute tool call if present
        let searchedWorks: Awaited<ReturnType<typeof executeSearchWorks>> = []

        if (
            firstChoice.finish_reason === 'tool_calls' &&
            assistantMessage.tool_calls &&
            assistantMessage.tool_calls.length > 0
        ) {
            const rawToolCall = assistantMessage.tool_calls[0]

            let toolArgs: Parameters<typeof executeSearchWorks>[0] = {}
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fnArgs = (rawToolCall as any).function?.arguments
                if (fnArgs) toolArgs = JSON.parse(fnArgs)
            } catch {
                toolArgs = {}
            }

            searchedWorks = await executeSearchWorks(toolArgs)

            const toolResultMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
                role: 'tool',
                tool_call_id: rawToolCall.id,
                content: JSON.stringify(searchedWorks),
            }

            messages.push(assistantMessage)
            messages.push(toolResultMessage)

            // Second call: AI writes analysis
            const secondResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
                temperature: 0.7,
                max_tokens: 900,
            })

            const explanation = secondResponse.choices[0].message.content || ''

            return NextResponse.json({ explanation, works: searchedWorks })
        }

        // Fallback: AI answered without tool call
        return NextResponse.json({
            explanation: assistantMessage.content || 'Tôi không tìm thấy kết quả phù hợp.',
            works: [],
        })
    } catch (error) {
        const err = error as { message?: string; status?: number; code?: string }
        console.error('[AI Search] error:', err?.message, '| status:', err?.status, '| code:', err?.code)
        return NextResponse.json(
            { error: 'Thủ thư đang nghỉ một chút, thử lại sau nhé.' },
            { status: 500 }
        )
    }
}
