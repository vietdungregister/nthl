import { prisma } from '@/lib/db'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import ExpandableContent from '@/components/ExpandableContent'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tác phẩm' }

interface Props { searchParams: Promise<{ genre?: string; tag?: string; page?: string; month?: string; year?: string }> }

const VISUAL_GENRES = ['photo', 'video', 'painting']

export default async function WorksPage({ searchParams }: Props) {
    const sp = await searchParams
    const genre = sp.genre
    const tag = sp.tag
    const month = sp.month ? parseInt(sp.month) : undefined
    const year = sp.year ? parseInt(sp.year) : undefined
    const page = parseInt(sp.page || '1')
    const limit = 20

    const where: Record<string, unknown> = { status: 'published', deletedAt: null }
    if (genre) where.genre = genre
    if (tag) where.tags = { some: { tag: { slug: tag } } }
    if (year) {
        const startDate = new Date(year, month ? month - 1 : 0, 1)
        const endDate = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1)
        where.publishedAt = { gte: startDate, lt: endDate }
    }

    const [works, total, allTags, dbGenres] = await Promise.all([
        prisma.work.findMany({ where, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { tags: { include: { tag: true } } } }),
        prisma.work.count({ where }),
        prisma.tag.findMany({ orderBy: { name: 'asc' } }),
        prisma.genre.findMany({ orderBy: { order: 'asc' } }),
    ])

    const getLabel = (val: string) => dbGenres.find((g: { value: string; label: string }) => g.value === val)?.label ?? val

    const totalPages = Math.ceil(total / limit)

    const buildPageUrl = (p: number) => {
        const params = new URLSearchParams()
        if (genre) params.set('genre', genre)
        if (tag) params.set('tag', tag)
        if (month) params.set('month', String(month))
        if (year) params.set('year', String(year))
        params.set('page', String(p))
        return `/tac-pham?${params}`
    }

    return (
        <>
            {/* Date filter */}
            <form method="GET" action="/tac-pham" className="date-filter">
                {genre && <input type="hidden" name="genre" value={genre} />}
                {tag && <input type="hidden" name="tag" value={tag} />}
                <select name="month" defaultValue={month || ''} className="date-filter__select">
                    <option value="">Tháng</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
                </select>
                <select name="year" defaultValue={year || ''} className="date-filter__select">
                    <option value="">Năm</option>
                    {Array.from({ length: 10 }, (_, i) => 2026 - i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button type="submit" className="date-filter__btn">Lọc</button>
                {(month || year) && <Link href={`/tac-pham${genre ? `?genre=${genre}` : ''}`} className="date-filter__clear">✕ Bỏ lọc</Link>}
            </form>

            {tag && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 12px' }}>
                    <span className="tag-pill" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                        {allTags.find((t: { slug: string; name: string }) => t.slug === tag)?.name || tag}
                    </span>
                    <Link href="/tac-pham" style={{ color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none' }}>✕ bỏ lọc</Link>
                </div>
            )}

            {works.length > 0 ? (
                <div className="feed-layout" style={{ padding: '0', maxWidth: 'none' }}>
                    {works.map((work: { id: string; slug: string; genre: string; title: string; content: string; coverImageUrl: string | null; publishedAt: Date | null; isFeatured: boolean; tags: { tagId: string; tag: { name: string; slug: string } }[] }) => (
                        <article key={work.id} className="feed-card">
                            <div className="feed-card__header">
                                <span className="feed-card__genre">{getLabel(work.genre)}</span>
                                {work.isFeatured && <span className="poem-card__star">Nổi bật</span>}
                                {work.publishedAt && <span className="feed-card__date">{formatDate(work.publishedAt)}</span>}
                            </div>
                            {work.title && <Link href={`/tac-pham/${work.slug}`} className="feed-card__title">{work.title}</Link>}

                            {VISUAL_GENRES.includes(work.genre) && work.coverImageUrl && (
                                <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden' }}>
                                    {(work.genre === 'video' || work.coverImageUrl.match(/\.(mp4|webm|ogg|mov)$/i)) ? (
                                        <video src={work.coverImageUrl} controls muted playsInline style={{ width: '100%', maxHeight: 420, objectFit: 'cover', background: '#000' }} />
                                    ) : (
                                        <Link href={`/tac-pham/${work.slug}`}>
                                            <img src={work.coverImageUrl} alt={work.title} style={{ width: '100%', maxHeight: 420, objectFit: 'cover' }} />
                                        </Link>
                                    )}
                                </div>
                            )}

                            {!VISUAL_GENRES.includes(work.genre) && work.content && (
                                <ExpandableContent content={work.content} limit={500} className={work.genre === 'poem' ? 'feed-card__poem' : 'feed-card__prose'} />
                            )}
                            {VISUAL_GENRES.includes(work.genre) && work.content && (
                                <ExpandableContent content={work.content} limit={200} className="feed-card__prose" />
                            )}

                            {work.tags.length > 0 && (
                                <div className="feed-card__tags">
                                    {work.tags.slice(0, 3).map((wt: { tagId: string; tag: { name: string; slug: string } }) => (
                                        <Link key={wt.tagId} href={`/tac-pham?tag=${wt.tag.slug}`} className="tag-pill">{wt.tag.name}</Link>
                                    ))}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0', fontSize: 14 }}>
                    Không tìm thấy tác phẩm nào.
                </div>
            )}

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '24px 0 40px' }}>
                    {page > 1 && <Link href={buildPageUrl(page - 1)} className="pub-tab">← Trước</Link>}
                    <span style={{ padding: '6px 12px', color: 'var(--text-muted)', fontSize: 13 }}>Trang {page} / {totalPages}</span>
                    {page < totalPages && <Link href={buildPageUrl(page + 1)} className="pub-tab">Tiếp →</Link>}
                </div>
            )}
        </>
    )
}
