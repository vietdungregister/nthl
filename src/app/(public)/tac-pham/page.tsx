import { prisma } from '@/lib/db'
import { getCachedGenres, getCachedTags } from '@/lib/cache'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate } from '@/lib/utils'
import ExpandableContent from '@/components/ExpandableContent'
import WorksSmartSearch from '@/components/public/WorksSmartSearch'
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
    // Với photo/painting: chỉ hiện bài có ảnh thật (tránh ô trống)
    // Video: hiện cả bài không có coverImageUrl (dùng video placeholder)
    if (genre && genre !== 'video' && VISUAL_GENRES.includes(genre)) {
        where.AND = [
            { coverImageUrl: { not: null } },
            { coverImageUrl: { not: '' } },
        ]
    }
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
                publishedAt: true, writtenAt: true, isFeatured: true,
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
            <WorksSmartSearch genre={genre} month={month} year={year} defaultSearch={search}>

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
                            const url = work.coverImageUrl
                            const isVideo = work.genre === 'video' || (url && url.match(/\.(mp4|webm|ogg|mov)$/i))
                            return (
                                <Link key={work.id} href={`/tac-pham/${work.slug}`} className="insta-grid__item">
                                    {url ? (
                                        isVideo ? (
                                            <>
                                                <video src={url} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <div className="insta-grid__video-badge">▶</div>
                                            </>
                                        ) : (
                                            <Image src={url} alt={work.title || 'Ảnh'} width={400} height={400} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} sizes="(max-width: 768px) 33vw, 312px" />
                                        )
                                    ) : (
                                        <div className="insta-grid__placeholder">
                                            <span>{work.genre === 'video' ? '🎬' : work.genre === 'painting' ? '🎨' : '📷'}</span>
                                            <span className="insta-grid__placeholder-title">{work.title?.slice(0, 30) || 'Video'}</span>
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
                                    {(() => { const d = (work as any).writtenAt || work.publishedAt; return d && <span className="feed-card__date">{formatDate(d)}</span> })()}
                                </div>
                                {work.title && <Link href={`/tac-pham/${work.slug}`} className="feed-card__title">{work.title}</Link>}

                                {VISUAL_GENRES.includes(work.genre) && work.coverImageUrl && (
                                    <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden' }}>
                                        {(work.genre === 'video' || work.coverImageUrl.match(/\.(mp4|webm|ogg|mov)$/i)) ? (
                                            <video src={work.coverImageUrl} controls muted playsInline preload="none" style={{ width: '100%', maxHeight: 420, objectFit: 'cover', background: '#000' }} />
                                        ) : (
                                            <Link href={`/tac-pham/${work.slug}`}>
                                                <Image src={work.coverImageUrl} alt={work.title ?? ''} width={800} height={420} loading="lazy" style={{ width: '100%', maxHeight: 420, objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 800px" />
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

            {/* Pagination */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexWrap: 'wrap', gap: 6, padding: '24px 0 40px',
                fontFamily: "'Inter', sans-serif", fontSize: 13,
            }}>
                <span style={{ color: 'var(--text-muted)', marginRight: 8, width: '100%', textAlign: 'center' }}>
                    {total.toLocaleString('vi-VN')} tác phẩm · Trang {page}/{totalPages}
                </span>
                {page > 1 && <Link href={buildPageUrl(1)} className="pub-tab">« Đầu</Link>}
                {page > 1 && <Link href={buildPageUrl(page - 1)} className="pub-tab">← Trước</Link>}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .map((p, i, arr) => (
                        <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {i > 0 && arr[i - 1] !== p - 1 && <span style={{ color: 'var(--text-muted)' }}>…</span>}
                            <Link href={buildPageUrl(p)} className="pub-tab"
                                style={p === page ? { background: 'var(--accent)', color: '#fff', borderColor: 'transparent' } : {}}>
                                {p}
                            </Link>
                        </span>
                    ))}
                {page < totalPages && <Link href={buildPageUrl(page + 1)} className="pub-tab">Tiếp →</Link>}
                {page < totalPages && <Link href={buildPageUrl(totalPages)} className="pub-tab">Cuối »</Link>}
            </div>
            </WorksSmartSearch>
        </>
    )
}
