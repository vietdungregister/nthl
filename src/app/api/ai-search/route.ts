import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/db'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ---- Vector Search (semantic) ---------------------------------------
async function vectorSearch(queryText: string, limit = 200) {
    const embResponse = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: queryText,
    })
    const queryEmb = embResponse.data[0].embedding
    const embStr = '[' + queryEmb.join(',') + ']'

    // Tăng ef_search cho recall tốt hơn (mặc định 40)
    await prisma.$executeRawUnsafe('SET hnsw.ef_search = 100')

    // Cast sang halfvec(3072) để dùng HNSW index (vector type giới hạn 2000 dims)
    return prisma.$queryRawUnsafe<Array<{
        workId: string
        content: string
        similarity: number
    }>>(
        `SELECT c."workId", c.content,
                1 - (c.embedding::halfvec(3072) <=> $1::halfvec(3072)) as similarity
         FROM "ChatChunk" c
         WHERE c."isBlocked" = false
           AND c.embedding IS NOT NULL
         ORDER BY c.embedding::halfvec(3072) <=> $1::halfvec(3072)
         LIMIT $2`,
        embStr,
        limit
    )
}

// ---- Text Search (fulltext) ----------------------------------------
async function textSearch(keywords: string, limit = 300) {
    return prisma.$queryRawUnsafe<Array<{
        workId: string
        content: string
    }>>(
        `SELECT c."workId", c.content
         FROM "ChatChunk" c
         WHERE c."isBlocked" = false
           AND c.content ILIKE $1
         ORDER BY c.score DESC, c."createdAt" DESC
         LIMIT $2`,
        `%${keywords}%`,
        limit
    )
}

// ---- Tách dòng từ chunk --------------------------------------------
function extractLines(content: string): string[] {
    return content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 5 && l.length < 300)
}

// ---- Hybrid Search -------------------------------------------------
async function hybridSearch(query: string, genre?: string) {
    const [vecResults, txtResults] = await Promise.all([
        vectorSearch(query, 200).catch(() => []),
        textSearch(query, 300).catch(() => []),
    ])

    // Gom theo workId — vector weight ×2, text weight ×1
    const workScores = new Map<string, {
        score: number
        lines: string[]
    }>()

    vecResults.forEach((r, i) => {
        const e = workScores.get(r.workId) ?? { score: 0, lines: [] }
        e.score += (200 - i) * 2
        e.lines.push(...extractLines(r.content))
        workScores.set(r.workId, e)
    })

    txtResults.forEach((r, i) => {
        const e = workScores.get(r.workId) ?? { score: 0, lines: [] }
        e.score += (300 - i) * 1
        e.lines.push(...extractLines(r.content))
        workScores.set(r.workId, e)
    })

    // Sort theo score
    const ranked = [...workScores.entries()]
        .sort((a, b) => b[1].score - a[1].score)

    if (ranked.length === 0) return []

    const workIds = ranked.map(([id]) => id)

    // Lấy thông tin work
    const works = await prisma.work.findMany({
        where: {
            id: { in: workIds },
            status: 'published',
            deletedAt: null,
            ...(genre ? { genre } : {}),
        },
        select: {
            id: true,
            title: true,
            slug: true,
            genre: true,
            publishedAt: true,
            writtenAt: true,
        },
    })

    const workInfoMap = new Map(works.map(w => [w.id, w]))
    const seenTitles = new Set<string>()

    return ranked
        .filter(([id]) => workInfoMap.has(id))
        .map(([id, data]) => {
            const w = workInfoMap.get(id)!
            // Dedup dòng trùng
            const uniqueLines = [...new Set(data.lines)]
            return {
                id: w.id,
                title: w.title,
                slug: w.slug,
                genre: w.genre,
                publishedAt: w.publishedAt,
                writtenAt: w.writtenAt,
                preview_sentences: uniqueLines,
            }
        })
        .filter(w => {
            const key = w.title?.trim().toLowerCase() || w.id
            if (seenTitles.has(key)) return false
            seenTitles.add(key)
            return true
        })
}

// ---- Route Handler -------------------------------------------------
export async function POST(request: NextRequest) {
    try {
        const { query, genre } = await request.json()

        if (!query || typeof query !== 'string' || !query.trim()) {
            return NextResponse.json({ error: 'Vui lòng nhập từ khóa tìm kiếm.' }, { status: 400 })
        }
        if (query.length > 500) {
            return NextResponse.json({ error: 'Từ khóa quá dài.' }, { status: 400 })
        }

        const works = await hybridSearch(query.trim(), genre)
        console.log(`[Search] "${query}" → ${works.length} works`)

        return NextResponse.json({ works })
    } catch (error) {
        const err = error as { message?: string }
        console.error('[Search] error:', err?.message)
        return NextResponse.json({ error: 'Có lỗi xảy ra, thử lại sau nhé.' }, { status: 500 })
    }
}
