import { prisma } from '@/lib/db'
import { getCachedGenres } from '@/lib/cache'
import Link from 'next/link'
import Image from 'next/image'
import ExpandableContent from '@/components/ExpandableContent'
import LazyDailyWorkBanner from '@/components/lazy/LazyDailyWorkBanner'
import WorksSmartSearch from '@/components/public/WorksSmartSearch'

// Dynamic vì có pagination + search params
export const dynamic = 'force-dynamic'

const VISUAL_GENRES = ['photo', 'video', 'painting']
const TEXT_GENRES   = ['poem', 'short_story', 'essay', 'novel', 'prose']

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const WORK_LIST_SELECT = {
  id: true, title: true, slug: true, genre: true,
  excerpt: true, coverImageUrl: true,
  publishedAt: true, writtenAt: true, isFeatured: true,
  tags: { include: { tag: { select: { name: true, slug: true } } } },
} as const

interface Props { searchParams: Promise<{ page?: string }> }

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || '1'))
  const limit = 20

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const [works, total, dbGenres, featuredToday] = await Promise.all([
    prisma.work.findMany({
      where: { status: 'published', deletedAt: null },
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { publishedAt: 'desc' },
      select: WORK_LIST_SELECT,
    }).catch(() => []),
    prisma.work.count({ where: { status: 'published', deletedAt: null } }).catch(() => 0),
    getCachedGenres().catch(() => []),
    prisma.work.findMany({
      where: { status: 'published', deletedAt: null, featuredDate: { gte: todayStart, lt: todayEnd } },
      select: { id: true, title: true, slug: true, genre: true, excerpt: true },
    }).catch(() => []),
  ])

  const getLabel = (val: string) => dbGenres.find(g => g.value === val)?.label ?? val
  const totalPages = Math.ceil(total / limit)

  const buildUrl = (p: number) => p === 1 ? '/' : `/?page=${p}`

  let dailyWork = null
  if (featuredToday.length > 0) {
    const w = pickRandom(featuredToday)
    dailyWork = { ...w, content: w.excerpt ?? '', genreLabel: getLabel(w.genre) }
  } else {
    const textWorks = works.filter(w => TEXT_GENRES.includes(w.genre))
    if (textWorks.length > 0) {
      const w = pickRandom(textWorks)
      dailyWork = { id: w.id, title: w.title, slug: w.slug, genre: w.genre, content: w.excerpt ?? '', genreLabel: getLabel(w.genre) }
    }
  }

  return (
    <>
      {/* Hero */}
      <div className="pub-hero" style={{ padding: '20px 16px 24px' }}>
        <h1>Nguyễn Thế Hoàng Linh</h1>
      </div>

      {/* Daily Work Banner */}
      {dailyWork && <LazyDailyWorkBanner work={dailyWork} />}

      {/* Smart Search + Feed */}
      <WorksSmartSearch>
        {/* Regular paginated feed */}
        <div className="feed-layout" style={{ padding: '0', maxWidth: 'none' }}>
          {works.map(work => (
            <article key={work.id} className="feed-card">
              <div className="feed-card__header">
                <span className="feed-card__genre">{getLabel(work.genre)}</span>
                {work.isFeatured && <span className="poem-card__star">Nổi bật</span>}
                {(() => { const d = (work as any).writtenAt || work.publishedAt; return d && (
                  <span className="feed-card__date">
                    {new Date(d).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                )})()}
              </div>
              {work.title && <Link href={`/tac-pham/${work.slug}`} className="feed-card__title">{work.title}</Link>}

              {VISUAL_GENRES.includes(work.genre) && work.coverImageUrl && (
                <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden' }}>
                  {(work.genre === 'video' || work.coverImageUrl.match(/\.(mp4|webm|ogg|mov)$/i)) ? (
                    <video src={work.coverImageUrl} controls muted playsInline preload="none" style={{ width: '100%', maxHeight: 420, objectFit: 'cover', background: '#000' }} />
                  ) : (
                    <Link href={`/tac-pham/${work.slug}`}>
                      <Image src={work.coverImageUrl} alt={work.title ?? ''} width={800} height={420} style={{ width: '100%', maxHeight: 420, objectFit: 'cover' }} loading="lazy" sizes="(max-width: 768px) 100vw, 800px" />
                    </Link>
                  )}
                </div>
              )}

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

        {/* Pagination */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexWrap: 'wrap', gap: 6, padding: '24px 0 40px',
          fontFamily: "'Inter', sans-serif", fontSize: 13,
        }}>
          <span style={{ color: 'var(--text-muted)', width: '100%', textAlign: 'center' }}>
            {total.toLocaleString('vi-VN')} tác phẩm · Trang {page}/{totalPages}
          </span>
          {page > 1 && <Link href={buildUrl(1)} className="pub-tab">« Đầu</Link>}
          {page > 1 && <Link href={buildUrl(page - 1)} className="pub-tab">← Trước</Link>}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .map((p, i, arr) => (
              <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && arr[i - 1] !== p - 1 && <span style={{ color: 'var(--text-muted)' }}>…</span>}
                <Link href={buildUrl(p)} className="pub-tab"
                  style={p === page ? { background: 'var(--accent)', color: '#fff', borderColor: 'transparent' } : {}}>
                  {p}
                </Link>
              </span>
            ))}
          {page < totalPages && <Link href={buildUrl(page + 1)} className="pub-tab">Tiếp →</Link>}
          {page < totalPages && <Link href={buildUrl(totalPages)} className="pub-tab">Cuối »</Link>}
        </div>
      </WorksSmartSearch>
    </>
  )
}
