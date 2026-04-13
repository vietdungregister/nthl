import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Chuẩn hóa query: bỏ ký tự đặc biệt tsquery, giữ dấu tiếng Việt */
function sanitizeQuery(q: string): string {
    return q.replace(/[&|!():*<>@\\]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Tách dòng thơ match query để highlight */
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

// ── Main search function ───────────────────────────────────────────────────────

async function tieredSearch(query: string, genre?: string): Promise<WorkRow[]> {
    const sanitized = sanitizeQuery(query)
    if (!sanitized) return []

    const genreFilter = genre ? `AND genre = '${genre.replace(/'/g, "''")}'` : ''
    const baseWhere = `status = 'published' AND "deletedAt" IS NULL ${genreFilter}`

    // ── TIER 1: Title exact match (highest priority) ──────────────────────────
    const tier1: WorkRow[] = await prisma.$queryRawUnsafe(`
        SELECT id, title, slug, genre, content, excerpt,
               1 AS tier,
               ts_rank("searchVector", plainto_tsquery('simple', unaccent($1))) + 10.0 AS rank
        FROM "Work"
        WHERE ${baseWhere}
          AND "searchVector" IS NOT NULL
          AND unaccent(lower(title)) ILIKE '%' || unaccent(lower($1)) || '%'
        ORDER BY rank DESC
        LIMIT 20
    `, sanitized)

    const tier1ids = tier1.map(r => `'${r.id}'`).join(',') || "''"

    // ── TIER 2: Content exact phrase match ────────────────────────────────────
    const tier2: WorkRow[] = await prisma.$queryRawUnsafe(`
        SELECT id, title, slug, genre, content, excerpt,
               2 AS tier,
               ts_rank("searchVector", plainto_tsquery('simple', unaccent($1))) + 5.0 AS rank
        FROM "Work"
        WHERE ${baseWhere}
          AND "searchVector" IS NOT NULL
          AND id NOT IN (${tier1ids})
          AND unaccent(lower(content)) ILIKE '%' || unaccent(lower($1)) || '%'
        ORDER BY rank DESC
        LIMIT 30
    `, sanitized)

    const tier1_2ids = [...tier1, ...tier2].map(r => `'${r.id}'`).join(',') || "''"

    // ── TIER 3: Full-text (tách từ, plainto_tsquery) ──────────────────────────
    const tier3: WorkRow[] = await prisma.$queryRawUnsafe(`
        SELECT id, title, slug, genre, content, excerpt,
               3 AS tier,
               ts_rank("searchVector", plainto_tsquery('simple', unaccent($1))) AS rank
        FROM "Work"
        WHERE ${baseWhere}
          AND "searchVector" IS NOT NULL
          AND id NOT IN (${tier1_2ids})
          AND "searchVector" @@ plainto_tsquery('simple', unaccent($1))
        ORDER BY rank DESC
        LIMIT 30
    `, sanitized)

    const combined = [...tier1, ...tier2, ...tier3]

    // ── TIER 4: Fuzzy fallback (pg_trgm) nếu ít kết quả ─────────────────────
    if (combined.length < 5) {
        const allids = combined.map(r => `'${r.id}'`).join(',') || "''"
        const fuzzy: WorkRow[] = await prisma.$queryRawUnsafe(`
            SELECT id, title, slug, genre, content, excerpt,
                   4 AS tier,
                   GREATEST(
                     similarity(unaccent(lower(title)), unaccent(lower($1))),
                     similarity(unaccent(lower(content)), unaccent(lower($1))) * 0.7
                   ) AS rank
            FROM "Work"
            WHERE ${baseWhere}
              AND id NOT IN (${allids})
              AND (
                similarity(unaccent(lower(title)), unaccent(lower($1))) > 0.25
                OR similarity(unaccent(lower(content)), unaccent(lower($1))) > 0.20
              )
            ORDER BY rank DESC
            LIMIT 10
        `, sanitized)
        combined.push(...fuzzy)
    }

    return combined
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

        const rows = await tieredSearch(q, genre)

        // Build results with matched lines for highlighting
        const works = rows.map(row => ({
            id: row.id,
            title: row.title,
            slug: row.slug,
            genre: row.genre,
            excerpt: row.excerpt,
            tier: row.tier,
            rank: row.rank,
            matchedLines: extractMatchedLines(row.content || '', q),
        }))

        console.log(`[Search] "${q}" → ${works.length} results (T1:${rows.filter(r=>r.tier===1).length} T2:${rows.filter(r=>r.tier===2).length} T3:${rows.filter(r=>r.tier===3).length} T4:${rows.filter(r=>r.tier===4).length})`)

        return NextResponse.json({ works, query: q, total: works.length })
    } catch (error) {
        const err = error as { message?: string }
        console.error('[Search] error:', err?.message)
        return NextResponse.json({ error: 'Có lỗi xảy ra, thử lại sau nhé.' }, { status: 500 })
    }
}
