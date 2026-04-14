import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Chuẩn hóa query: bỏ ký tự đặc biệt tsquery, giữ dấu tiếng Việt */
function sanitizeQuery(q: string): string {
    return q.replace(/[&|!():*<>@\\]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Tách dòng thơ match query để hiển thị snippet */
function extractMatchedLines(content: string, query: string): string[] {
    if (!content || !query) return []
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1)
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 3)

    const matched: string[] = []
    for (const line of lines) {
        const lower = line.toLowerCase()
        const hasMatch = queryWords.some(word => lower.includes(word))
        if (hasMatch) {
            matched.push(line)
            if (matched.length >= 3) break
        }
    }
    return matched
}

// ── Interfaces ────────────────────────────────────────────────────────────────

interface WorkRow {
    id: string
    title: string
    slug: string
    genre: string
    content: string
    excerpt: string | null
    rank: number
    tier: number
}

// ── Progressive Phrase Search ─────────────────────────────────────────────────

async function progressiveSearch(query: string, genre?: string): Promise<WorkRow[]> {
    const sanitized = sanitizeQuery(query)
    if (!sanitized) return []

    const words = sanitized.split(/\s+/).filter(w => w.length > 0)
    const genreFilter = genre ? `AND genre = '${genre.replace(/'/g, "''")}'` : ''
    const baseWhere = `status = 'published' AND "deletedAt" IS NULL ${genreFilter}`

    const allResults: WorkRow[] = []
    const foundIds = new Set<string>()

    // Progressive: thử cụm dài nhất trước, bỏ từ phải dần
    // "một bài thơ hay" → "một bài thơ" → "bài thơ"
    // Tối thiểu 2 từ
    for (let len = words.length; len >= Math.min(2, words.length); len--) {
        if (allResults.length >= 50) break  // short-circuit

        const phrase = words.slice(0, len).join(' ')
        const excludeList = foundIds.size > 0
            ? `AND id NOT IN (${[...foundIds].map(id => `'${id}'`).join(',')})`
            : ''

        const rows: WorkRow[] = await prisma.$queryRawUnsafe(`
            SELECT id, title, slug, genre, content, excerpt,
                   ${words.length - len + 1} AS tier,
                   similarity(unaccent(lower(title)), unaccent(lower($1))) AS rank
            FROM "Work"
            WHERE ${baseWhere}
              AND "searchVector" IS NOT NULL
              ${excludeList}
              AND "searchVector" @@ phraseto_tsquery('simple', unaccent($2))
            ORDER BY rank DESC
            LIMIT ${50 - allResults.length}
        `, sanitized, phrase)

        rows.forEach(r => foundIds.add(r.id))
        allResults.push(...rows)
    }

    // Sort: tier ưu tiên hơn (tier nhỏ = match dài hơn), nhưng
    // bài sim=0 ở tier tốt hơn không nên vượt bài sim cao ở tier thấp hơn.
    // Dùng composite: tier_boost * 10 + rank
    // tier 1 (4 từ) = boost 4, tier 2 (3 từ) = boost 3...
    const maxTier = words.length
    allResults.sort((a, b) => {
        const scoreA = (maxTier - Number(a.tier) + 1) * 10 + Number(a.rank)
        const scoreB = (maxTier - Number(b.tier) + 1) * 10 + Number(b.rank)
        return scoreB - scoreA
    })

    // ── Fuzzy fallback nếu ít kết quả (sai chính tả, thiếu dấu) ─────────────
    if (allResults.length < 5) {
        const excludeList = foundIds.size > 0
            ? `AND id NOT IN (${[...foundIds].map(id => `'${id}'`).join(',')})`
            : ''

        const fuzzy: WorkRow[] = await prisma.$queryRawUnsafe(`
            SELECT id, title, slug, genre, content, excerpt,
                   99 AS tier,
                   GREATEST(
                     similarity(unaccent(lower(title)), unaccent(lower($1))),
                     similarity(unaccent(lower(content)), unaccent(lower($1))) * 0.5
                   ) AS rank
            FROM "Work"
            WHERE ${baseWhere}
              ${excludeList}
              AND (
                similarity(unaccent(lower(title)), unaccent(lower($1))) > 0.2
                OR similarity(unaccent(lower(content)), unaccent(lower($1))) > 0.15
              )
            ORDER BY rank DESC
            LIMIT ${10 - allResults.length}
        `, sanitized)

        allResults.push(...fuzzy)
    }

    return allResults
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q')?.trim() || ''
        const genre = searchParams.get('genre') || undefined

        if (!q) {
            return NextResponse.json({ works: [], query: '' })
        }
        if (q.length > 200) {
            return NextResponse.json({ error: 'Query quá dài' }, { status: 400 })
        }

        const rows = await progressiveSearch(q, genre)

        const works = rows.map(row => ({
            id: row.id,
            title: row.title,
            slug: row.slug,
            genre: row.genre,
            excerpt: row.excerpt,
            tier: Number(row.tier),
            rank: Number(row.rank),
            matchedLines: extractMatchedLines(row.content || '', q),
        }))

        const tierBreakdown = works.reduce((acc, w) => {
            acc[w.tier] = (acc[w.tier] || 0) + 1
            return acc
        }, {} as Record<number, number>)

        console.log(`[Search] "${q}" → ${works.length} results`, tierBreakdown)

        return NextResponse.json({ works, query: q, total: works.length })
    } catch (error) {
        const err = error as { message?: string }
        console.error('[Search] error:', err?.message)
        return NextResponse.json({ error: 'Có lỗi xảy ra, thử lại sau nhé.' }, { status: 500 })
    }
}
