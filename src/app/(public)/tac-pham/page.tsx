import { prisma } from '@/lib/db'
import { getCachedGenres, getCachedTags } from '@/lib/cache'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import ExpandableContent from '@/components/ExpandableContent'
import type { Metadata } from 'next'

// Trang có searchParams → dynamic, nhưng genres/tags được cache riêng (1h)
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Tác phẩm' }

interface Props { searchParams: Promise<{ genre?: string; tag?: string; page?: string; month?: string; year?: string; search?: string }> }

const VISUAL_GENRES = ['photo', 'video', 'painting']

export default async function WorksPage({ searchParams }: Props) {
    const sp = await searchParams
    const genre = sp.genre
    const tag = sp.tag
    const search = sp.search
    const month = sp.month ? parseInt(sp.month) : undefined
    const year = sp.year ? parseInt(sp.year) : undefined
    const page = parseInt(sp.page || '1')
    const limit = 20

    const where: Record<string, unknown> = { status: 'published', deletedAt: null }
    if (genre) where.genre = genre
    if (tag) where.tags = { some: { tag: { slug: tag } } }
    if (search) {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
            { excerpt: { contains: search, mode: 'insensitive' } },
        ]
    }
    if (year) {
        const startDate = new Date(year, month ? month - 1 : 0, 1)
        const endDate = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1)
        where.publishedAt = { gte: startDate, lt: endDate }
    }

    // genres + tags được cache 1h — không query DB mỗi request
    // works + total vẫn dynamic theo filter của user
    const [works, total, allTags, dbGenres] = await Promise.all([
        prisma.work.findMany({
            where,
            orderBy: { publishedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            // KHÔNG select content — với 10k tác phẩm × vài trăm KB = GB dữ liệu thừa
            select: {
                id: true, title: true, slug: true, genre: true,
                excerpt: true, coverImageUrl: true,
                publishedAt: true, isFeatured: true,
                tags: { include: { tag: { select: { name: true, slug: true } } } },
            },
        }),
        prisma.work.count({ where }),
        getCachedTags(),    // cached 1h
        getCachedGenres(),  // cached 1h
    ])

    const SPECIAL_LABELS: Record<string, string> = { photo: 'Ảnh', video: 'Video' }
    const getLabel = (val: string) => dbGenres.find(g => g.value === val)?.label ?? SPECIAL_LABELS[val] ?? val

    const totalPages = Math.ceil(total / limit)

    const buildPageUrl = (p: number) => {
        const params = new URLSearchParams()
        if (genre) params.set('genre', genre)
        if (tag) params.set('tag', tag)
        if (search) params.set('search', search)
        if (month) params.set('month', String(month))
        if (year) params.set('year', String(year))
        params.set('page', String(p))
        return `/tac-pham?${params}`
    }

    return (
        <>
            {/* Date filter & Search */}
            <form method="GET" action="/tac-pham" className="date-filter" style={{ flexWrap: 'wrap' }}>
                {genre && <input type="hidden" name="genre" value={genre} />}
                {tag && <input type="hidden" name="tag" value={tag} />}
                <input
                    type="text"
                    name="search"
                    defaultValue={search || ''}
                    placeholder="Tìm tác phẩm..."
                    className="date-filter__select"
                    style={{ flex: '1 1 200px', minWidth: 200 }}
                />
                <select name="month" defaultValue={month || ''} className="date-filter__select">
                    <option value="">Tháng</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
                </select>
                <select name="year" defaultValue={year || ''} className="date-filter__select">
                    <option value="">Năm</option>
                    {Array.from({ length: 10 }, (_, i) => 2026 - i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button type="submit" className="date-filter__btn">Lọc/Tìm</button>
                {(month || year || search) && <Link href={`/tac-pham${genre ? `?genre=${genre}` : ''}`} className="date-filter__clear">✕ Bỏ lọc</Link>}
            </form>

            {tag && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 12px' }}>
                    <span className="tag-pill" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                        {allTags.find(t => t.slug === tag)?.name || tag}
                    </span>
                    <Link href="/tac-pham" style={{ color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none' }}>✕ bỏ lọc</Link>
                </div>
            )}

            {works.length > 0 ? (
                genre && VISUAL_GENRES.includes(genre) ? (
                    /* Instagram-style grid for photo/video/painting genres */
                    <div className="insta-grid">
                        {works.map(work => {
                            const isVideo = work.genre === 'video' || (work.coverImageUrl && work.coverImageUrl.match(/\.(mp4|webm|ogg|mov)$/i))
                            return (
                                <Link key={work.id} href={`/tac-pham/${work.slug}`} className="insta-grid__item">
                                    {work.coverImageUrl ? (
                                        isVideo ? (
                                            <>
                                                <video src={work.coverImageUrl} muted playsInline preload="none" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <div className="insta-grid__video-badge">▶</div>
                                            </>
                                        ) : (
                                            <img src={work.coverImageUrl} alt={work.title || 'Ảnh'} loading="lazy" />
                                        )
                                    ) : (
                                        <div className="insta-grid__placeholder">
                                            <span>{work.genre === 'video' ? '🎬' : work.genre === 'painting' ? '🎨' : '📷'}</span>
                                            <span className="insta-grid__placeholder-title">{work.title || (work.genre === 'video' ? 'Video' : 'Ảnh')}</span>
                                        </div>
                                    )}
                                    <div className="insta-grid__overlay">
                                        <span>{work.title || work.excerpt?.slice(0, 40) || ''}</span>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    /* Feed layout — dùng excerpt thay content để tránh load hàng GB */
                    <div className="feed-layout" style={{ padding: '0', maxWidth: 'none' }}>
                        {works.map(work => (
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
                                            <video src={work.coverImageUrl} controls muted playsInline preload="none" style={{ width: '100%', maxHeight: 420, objectFit: 'cover', background: '#000' }} />
                                        ) : (
                                            <Link href={`/tac-pham/${work.slug}`}>
                                                <img src={work.coverImageUrl} alt={work.title ?? ''} loading="lazy" style={{ width: '100%', maxHeight: 420, objectFit: 'cover' }} />
                                            </Link>
                                        )}
                                    </div>
                                )}

                                {/* Dùng excerpt — không cần load full content (có thể rất lớn) */}
                                {!VISUAL_GENRES.includes(work.genre) && work.excerpt && (
                                    <ExpandableContent content={work.excerpt} limit={500} className={work.genre === 'poem' ? 'feed-card__poem' : 'feed-card__prose'} />
                                )}
                                {VISUAL_GENRES.includes(work.genre) && work.excerpt && (
                                    <ExpandableContent content={work.excerpt} limit={200} className="feed-card__prose" />
                                )}

                                {work.tags.length > 0 && (
                                    <div className="feed-card__tags">
                                        {work.tags.slice(0, 3).map(wt => (
                                            <Link key={wt.tagId} href={`/tac-pham?tag=${wt.tag.slug}`} className="tag-pill">{wt.tag.name}</Link>
                                        ))}
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )
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
