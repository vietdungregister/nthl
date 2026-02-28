import { prisma } from '@/lib/db'
import Link from 'next/link'
import type { Metadata } from 'next'
import AILibrarian from '@/components/public/AILibrarian'

export const metadata: Metadata = { title: 'Tìm kiếm' }
export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ q?: string }> }

// Row trả về từ raw SQL query — KHÔNG bao gồm content
interface SearchRow {
    id: string
    title: string
    slug: string
    genre: string
    excerpt: string | null
}

/**
 * Full-text search dùng PostgreSQL tsvector + GIN index.
 *
 * Tại sao không dùng Prisma contains()?
 * - contains() → SQL LIKE '%query%' → sequential scan toàn bộ bảng
 * - Với content field 3-4GB, LIKE '%...%' mất hàng chục giây mỗi query
 * - tsvector + GIN index → O(log n), kết quả trong milli-seconds
 *
 * GIN index được tạo trong migration: add-performance-indexes
 * (xem prisma/migrations/)
 */
async function searchWorks(query: string): Promise<SearchRow[]> {
    // Sanitize: loại bỏ ký tự đặc biệt của tsquery để tránh lỗi syntax
    const sanitized = query.replace(/[&|!():*<>]/g, ' ').trim()
    if (!sanitized) return []

    // plainto_tsquery tự parse chuỗi tự nhiên, không cần thêm & | thủ công
    // 'simple' dictionary: không stemming, phù hợp tiếng Việt có dấu
    const results = await prisma.$queryRaw<SearchRow[]>`
        SELECT
            id,
            title,
            slug,
            genre,
            excerpt
        FROM "Work"
        WHERE
            status = 'published'
            AND "deletedAt" IS NULL
            AND to_tsvector('simple',
                coalesce(title, '') || ' ' ||
                coalesce(excerpt, '') || ' ' ||
                coalesce(content, '')
            ) @@ plainto_tsquery('simple', ${sanitized})
        ORDER BY
            ts_rank(
                to_tsvector('simple',
                    coalesce(title, '') || ' ' ||
                    coalesce(excerpt, '') || ' ' ||
                    coalesce(content, '')
                ),
                plainto_tsquery('simple', ${sanitized})
            ) DESC,
            "publishedAt" DESC NULLS LAST
        LIMIT 30
    `

    return results
}

export default async function SearchPage({ searchParams }: Props) {
    const sp = await searchParams
    const query = sp.q?.trim() || ''

    if (!query) return <AILibrarian />

    const works = await searchWorks(query)

    return (
        <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                Tìm thấy <strong style={{ color: 'var(--text-primary)' }}>{works.length}</strong> kết quả cho &ldquo;{query}&rdquo;
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
                {works.map(work => (
                    <Link key={work.id} href={`/tac-pham/${work.slug}`} className="poem-card" style={{ minHeight: 'auto' }}>
                        <div className="poem-card__title">{work.title}</div>
                        <div className="poem-card__excerpt">{work.excerpt ?? ''}</div>
                    </Link>
                ))}
                {works.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                        Không tìm thấy kết quả nào.
                    </div>
                )}
            </div>

            <AILibrarian />
        </div>
    )
}
