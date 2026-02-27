import { prisma } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getGenreLabel, formatDate } from '@/lib/utils'
import CommentSection from '@/components/CommentSection'
import PublicHeader from '@/components/PublicHeader'
import type { Metadata } from 'next'

interface Props { params: Promise<{ slug: string }> }

const VISUAL_GENRES = ['photo', 'video', 'painting']

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const work = await prisma.work.findUnique({ where: { slug, status: 'published', deletedAt: null } })
    if (!work) return {}
    return { title: work.seoTitle || work.title, description: work.seoDescription || work.excerpt || work.content.slice(0, 160), openGraph: { title: work.seoTitle || work.title, type: 'article' } }
}

export default async function WorkDetailPage({ params }: Props) {
    const { slug } = await params
    const work = await prisma.work.findUnique({
        where: { slug, status: 'published', deletedAt: null },
        include: { tags: { include: { tag: true } }, collections: { include: { collection: true } } },
    })
    if (!work) notFound()

    await prisma.work.update({ where: { id: work.id }, data: { viewCount: { increment: 1 } } })

    const [prev, next, related] = await Promise.all([
        prisma.work.findFirst({ where: { status: 'published', deletedAt: null, publishedAt: { lt: work.publishedAt || undefined } }, orderBy: { publishedAt: 'desc' }, select: { title: true, slug: true } }),
        prisma.work.findFirst({ where: { status: 'published', deletedAt: null, publishedAt: { gt: work.publishedAt || undefined } }, orderBy: { publishedAt: 'asc' }, select: { title: true, slug: true } }),
        prisma.work.findMany({ where: { genre: work.genre, status: 'published', deletedAt: null, id: { not: work.id } }, take: 3, orderBy: { publishedAt: 'desc' } }),
    ])

    const isVisualGenre = VISUAL_GENRES.includes(work.genre)
    const isVideo = work.genre === 'video' || (work.coverImageUrl && work.coverImageUrl.match(/\.(mp4|webm|ogg|mov)$/i))
    const shareUrl = `https://nguyenthehoanglinh.vn/tac-pham/${work.slug}`

    return (
        <div className="public-shell">
            <PublicHeader />

            <div className="reading-wrapper">
                <Link href="/tac-pham" className="reading-back">← Tác phẩm</Link>
                <div className="reading-meta">
                    {getGenreLabel(work.genre)} · {work.publishedAt ? formatDate(work.publishedAt) : ''} · {work.viewCount} lượt xem
                </div>

                <div className="reading-card">
                    <div className="reading-card__title">{work.title}</div>

                    {/* Display image/video for visual genres */}
                    {isVisualGenre && work.coverImageUrl && (
                        <div className="reading-card__media">
                            {isVideo ? (
                                <video src={work.coverImageUrl} controls style={{ width: '100%', maxHeight: 600, borderRadius: 8 }} />
                            ) : (
                                <img src={work.coverImageUrl} alt={work.title} style={{ width: '100%', maxHeight: 600, objectFit: 'contain', borderRadius: 8 }} />
                            )}
                        </div>
                    )}

                    {/* Content — always use white-space: pre-wrap to preserve formatting from CMS */}
                    {work.content && (
                        <div className={isVisualGenre ? 'reading-card__prose' : (work.genre === 'poem' ? 'reading-card__poem' : 'reading-card__prose')}>
                            {work.content}
                        </div>
                    )}
                </div>

                {/* Tags */}
                {work.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
                        {work.tags.map(wt => (
                            <Link key={wt.tagId} href={`/tag/${wt.tag.slug}`} className="tag-pill">{wt.tag.name}</Link>
                        ))}
                    </div>
                )}

                {/* Collections */}
                {work.collections.length > 0 && (
                    <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                        Bộ sưu tập:{' '}
                        {work.collections.map((wc, i) => (
                            <span key={wc.collectionId}>
                                <Link href={`/bo-suu-tap/${wc.collection.slug}`} style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
                                    {wc.collection.title}
                                </Link>
                                {i < work.collections.length - 1 && ', '}
                            </span>
                        ))}
                    </div>
                )}

                {/* Share */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                        target="_blank" rel="noopener noreferrer" className="tag-pill" style={{ fontSize: 13 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                        </svg>
                        Chia sẻ Facebook
                    </a>
                </div>

                {/* Comments */}
                <div style={{ marginTop: 32 }}>
                    <CommentSection workId={work.id} expanded />
                </div>

                {/* Prev / Next */}
                <div className="reading-nav">
                    {prev ? <Link href={`/tac-pham/${prev.slug}`}>← {prev.title}</Link> : <span style={{ flex: 1 }} />}
                    {next ? <Link href={`/tac-pham/${next.slug}`} style={{ textAlign: 'right' }}>{next.title} →</Link> : <span style={{ flex: 1 }} />}
                </div>
            </div>

            {/* Related */}
            {related.length > 0 && (
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 40px' }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--text-primary)', marginBottom: 16 }}>Tác phẩm liên quan</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                        {related.map(r => (
                            <Link key={r.id} href={`/tac-pham/${r.slug}`} className="poem-card" style={{ minHeight: 'auto' }}>
                                <div className="poem-card__title">{r.title}</div>
                                <div className="poem-card__excerpt">{r.excerpt || r.content.slice(0, 80)}</div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <footer className="pub-footer">
                <p>© 2026 Nguyễn Thế Hoàng Linh
                    <a href="https://facebook.com/nguyenthehoanglinh" target="_blank" rel="noopener noreferrer">Facebook</a>
                </p>
            </footer>
        </div>
    )
}
