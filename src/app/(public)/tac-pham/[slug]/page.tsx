export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/db'
import { after } from 'next/server'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getGenreLabel, formatDate, cleanTitle, cleanContent } from '@/lib/utils'
import LazyCommentSection from '@/components/lazy/LazyCommentSection'
import KeyboardNav from '@/components/public/KeyboardNav'
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

    after(async () => {
        await prisma.work.update({ where: { id: work.id }, data: { viewCount: { increment: 1 } } })
    })

    const [prev, next, related] = await Promise.all([
        prisma.work.findFirst({ where: { status: 'published', deletedAt: null, publishedAt: { lt: work.publishedAt || undefined } }, orderBy: { publishedAt: 'desc' }, select: { title: true, slug: true } }),
        prisma.work.findFirst({ where: { status: 'published', deletedAt: null, publishedAt: { gt: work.publishedAt || undefined } }, orderBy: { publishedAt: 'asc' }, select: { title: true, slug: true } }),
        prisma.work.findMany({
            where: { genre: work.genre, status: 'published', deletedAt: null, id: { not: work.id } },
            take: 3,
            orderBy: { publishedAt: 'desc' },
            select: { id: true, title: true, slug: true, excerpt: true },
        }),
    ])

    const isVisualGenre = VISUAL_GENRES.includes(work.genre)
    const isVideo = work.genre === 'video' || (work.coverImageUrl && work.coverImageUrl.match(/\.(mp4|webm|ogg|mov)$/i))

    const isPoem = !isVisualGenre && (work.genre === 'poem' || work.genre === 'stt')
    const lines = work.content.split('\n').filter(l => l.trim())
    const avgLen = lines.length ? lines.reduce((s, l) => s + l.length, 0) / lines.length : 0
    const contentClass = isPoem && avgLen <= 60 ? 'reading-card__poem' : 'reading-card__prose'

    const shareUrl = `https://nguyenthehoanglinh.vn/tac-pham/${work.slug}`

    return (
        <>
            <KeyboardNav prevSlug={prev?.slug} nextSlug={next?.slug} />

            <Link href="/tac-pham" className="reading-back">← Tác phẩm</Link>
            <div className="reading-meta">
                {getGenreLabel(work.genre)}
                {work.writtenAt && <> · Sáng tác: {formatDate(work.writtenAt)}</>}
                {work.publishedAt && !work.writtenAt && <> · {formatDate(work.publishedAt)}</>}
                {' '}· {work.viewCount} lượt xem
            </div>

            <div className="reading-card">
                {work.title && !work.title.startsWith('Ảnh —') && !work.title.startsWith('Video —') && (
                    <div className="reading-card__title">{cleanTitle(work.title)}</div>
                )}

                {isVisualGenre && work.coverImageUrl && (
                    <div className="reading-card__media">
                        {isVideo ? (
                            <video src={work.coverImageUrl} controls className="reading-card__video" />
                        ) : (
                            <Image src={work.coverImageUrl} alt={work.title} width={900} height={600} className="reading-card__image" priority />
                        )}
                    </div>
                )}

                {work.content && (
                    <div className={contentClass}>
                        {cleanContent(work.content)}
                    </div>
                )}
            </div>

            {/* Translations */}
            {work.translations && (() => {
                try {
                    const trs: Array<{ lang: string; title?: string; content: string; note?: string }> = JSON.parse(work.translations)
                    if (!trs || trs.length === 0) return null
                    return (
                        <div className="reading-translations">
                            <h2 className="reading-translations__title">Bản dịch</h2>
                            {trs.map((tr, i) => (
                                <div key={i} className="reading-translations__item">
                                    <div className="meta">{tr.lang}{tr.title && ` — ${tr.title}`}</div>
                                    {tr.note && <div className="reading-translations__note">{tr.note}</div>}
                                    <div className="reading-card__prose reading-translations__content">
                                        {tr.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                } catch { return null }
            })()}

            {/* Tags */}
            {work.tags.length > 0 && (
                <div className="reading-tags">
                    {work.tags.map(wt => (
                        <Link key={wt.tagId} href={`/tag/${wt.tag.slug}`} className="tag-pill">{wt.tag.name}</Link>
                    ))}
                </div>
            )}

            {/* Collections */}
            {work.collections.length > 0 && (
                <div className="reading-collections">
                    Bộ sưu tập:{' '}
                    {work.collections.map((wc, i) => (
                        <span key={wc.collectionId}>
                            <Link href={`/bo-suu-tap/${wc.collection.slug}`} className="reading-collections__link">
                                {wc.collection.title}
                            </Link>
                            {i < work.collections.length - 1 && ', '}
                        </span>
                    ))}
                </div>
            )}

            {/* Share */}
            <div className="reading-share">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm btn--pill">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                    Chia sẻ Facebook
                </a>
            </div>

            {/* Comments */}
            <div className="reading-comments">
                <LazyCommentSection workId={work.id} expanded />
            </div>

            {/* Prev / Next */}
            <div className="reading-nav">
                {prev ? <Link href={`/tac-pham/${prev.slug}`}>← {prev.title}</Link> : <span style={{ flex: 1 }} />}
                {next ? <Link href={`/tac-pham/${next.slug}`} className="reading-nav__next">{next.title} →</Link> : <span style={{ flex: 1 }} />}
            </div>

            {/* Related */}
            {related.length > 0 && (
                <div className="reading-related">
                    <h3 className="reading-related__title">Tác phẩm liên quan</h3>
                    <div className="reading-related__grid">
                        {related.map(r => (
                            <Link key={r.id} href={`/tac-pham/${r.slug}`} className="poem-card">
                                <div className="poem-card__title">{cleanTitle(r.title)}</div>
                                <div className="poem-card__excerpt">{r.excerpt ?? ''}</div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
