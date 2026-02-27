import { prisma } from '@/lib/db'
import Link from 'next/link'
import { getGenreLabel, formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
    params: Promise<{ genre: string }>
    searchParams: Promise<{ page?: string }>
}

const TEXT_GENRES = ['poem', 'short_story', 'essay', 'novel', 'prose']
const VISUAL_GENRES = ['photo', 'video', 'painting']

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { genre } = await params
    return { title: getGenreLabel(genre) }
}

export default async function GenrePage({ params, searchParams }: Props) {
    const { genre } = await params
    const sp = await searchParams
    const page = parseInt(sp.page || '1')
    const limit = 12
    const isVisual = VISUAL_GENRES.includes(genre)

    const where = { genre, status: 'published', deletedAt: null }

    const [works, total] = await Promise.all([
        prisma.work.findMany({
            where,
            orderBy: { publishedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: { tags: { include: { tag: true } } },
        }),
        prisma.work.count({ where }),
    ])

    if (works.length === 0 && page === 1) notFound()

    const totalPages = Math.ceil(total / limit)

    const buildPageUrl = (p: number) => `/the-loai/${genre}?page=${p}`

    return (
        <div className="public-shell">
            <header className="pub-header">
                <div className="pub-header-inner">
                    <Link href="/" className="pub-logo">Nguyễn Thế Hoàng Linh</Link>
                    <nav className="pub-nav">
                        <Link href="/tac-pham">Tác phẩm</Link>
                        <Link href="/gioi-thieu">Giới thiệu</Link>
                    </nav>
                </div>
            </header>

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px 0' }}>
                <Link href="/tac-pham" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Tác phẩm</Link>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: 'var(--text-primary)', marginTop: 12 }}>{getGenreLabel(genre)}</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>{total} tác phẩm</p>
            </div>

            {isVisual ? (
                /* Instagram-style grid for photo/video/painting */
                <div className="insta-grid">
                    {works.map(w => {
                        const isVideo = w.genre === 'video' || (w.coverImageUrl && w.coverImageUrl.match(/\.(mp4|webm|ogg|mov)$/i))
                        return (
                            <Link key={w.id} href={`/tac-pham/${w.slug}`} className="insta-grid__item">
                                {w.coverImageUrl ? (
                                    isVideo ? (
                                        <>
                                            <video src={w.coverImageUrl} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <div className="insta-grid__video-badge">▶</div>
                                        </>
                                    ) : (
                                        <img src={w.coverImageUrl} alt={w.title || 'Ảnh'} />
                                    )
                                ) : (
                                    <div className="insta-grid__placeholder">
                                        <span>{genre === 'video' ? '🎬' : genre === 'painting' ? '🎨' : '📷'}</span>
                                        <span className="insta-grid__placeholder-title">{w.title || (genre === 'video' ? 'Video' : 'Ảnh')}</span>
                                    </div>
                                )}
                                <div className="insta-grid__overlay">
                                    <span>{w.title || w.content?.slice(0, 40) || ''}</span>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            ) : (
                /* Feed layout for text genres */
                <div className="feed-layout">
                    {works.map(w => (
                        <article key={w.id} className="feed-card">
                            <div className="feed-card__header">
                                <span className="feed-card__genre">{getGenreLabel(w.genre)}</span>
                                {w.publishedAt && <span className="feed-card__date">{formatDate(w.publishedAt)}</span>}
                            </div>
                            <Link href={`/tac-pham/${w.slug}`} className="feed-card__title">{w.title}</Link>
                            <div className={w.genre === 'poem' ? 'feed-card__poem' : 'feed-card__prose'}>
                                {w.genre === 'poem' ? (
                                    w.content
                                ) : (
                                    w.content.split('\n\n').slice(0, 3).map((para, i) => <p key={i}>{para}</p>)
                                )}
                            </div>
                            {w.content.length > 500 && w.genre !== 'poem' && (
                                <Link href={`/tac-pham/${w.slug}`} className="feed-card__readmore">Đọc tiếp →</Link>
                            )}
                            {w.tags.length > 0 && (
                                <div className="feed-card__tags">
                                    {w.tags.slice(0, 4).map(wt => (
                                        <Link key={wt.tagId} href={`/tac-pham?tag=${wt.tag.slug}`} className="tag-pill">{wt.tag.name}</Link>
                                    ))}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '0 40px 40px', maxWidth: 1200, margin: '0 auto' }}>
                    {page > 1 && (
                        <Link href={buildPageUrl(page - 1)} className="pub-tab">← Trước</Link>
                    )}
                    <span style={{ padding: '6px 12px', color: 'var(--text-muted)', fontSize: 13 }}>Trang {page} / {totalPages}</span>
                    {page < totalPages && (
                        <Link href={buildPageUrl(page + 1)} className="pub-tab">Sau →</Link>
                    )}
                </div>
            )}

            <footer className="pub-footer"><p>© 2026 Nguyễn Thế Hoàng Linh</p></footer>
        </div>
    )
}
