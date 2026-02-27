import { prisma } from '@/lib/db'
import Link from 'next/link'
import ExpandableContent from '@/components/ExpandableContent'
import DailyWorkBanner from '@/components/DailyWorkBanner'

const VISUAL_GENRES = ['photo', 'video', 'painting']
const TEXT_GENRES = ['poem', 'short_story', 'essay', 'novel', 'prose']

/** Pick a random item from an array */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default async function HomePage() {
  const [latest, dbGenres] = await Promise.all([
    prisma.work.findMany({
      where: { status: 'published', deletedAt: null },
      take: 20, orderBy: { publishedAt: 'desc' },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.genre.findMany({ orderBy: { order: 'asc' } }),
  ])

  const getLabel = (val: string) => dbGenres.find((g: { value: string; label: string }) => g.value === val)?.label ?? val

  // Tìm tác phẩm của ngày hôm nay
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  let dailyWork = null

  // 1. Ưu tiên: tác phẩm được admin set featuredDate = hôm nay
  const featuredToday = await prisma.work.findMany({
    where: {
      status: 'published',
      deletedAt: null,
      featuredDate: { gte: todayStart, lt: todayEnd },
    },
    select: { id: true, title: true, slug: true, genre: true, content: true },
  })

  if (featuredToday.length > 0) {
    const w = pickRandom(featuredToday)
    dailyWork = { ...w, genreLabel: getLabel(w.genre) }
  } else {
    // 2. Fallback: random từ kho text genre (toàn bộ DB, không chỉ 20 mới nhất)
    const textWorks = latest.filter(w => TEXT_GENRES.includes(w.genre))
    if (textWorks.length > 0) {
      const w = pickRandom(textWorks)
      dailyWork = {
        id: w.id, title: w.title, slug: w.slug,
        genre: w.genre, content: w.content,
        genreLabel: getLabel(w.genre),
      }
    }
  }

  return (
    <>
      {/* Hero */}
      <div className="pub-hero" style={{ padding: '20px 16px 24px' }}>
        <h1>Nguyễn Thế Hoàng Linh</h1>
        <div className="pub-hero-search">
          <form action="/tim-kiem" method="GET">
            <label className="pub-search-input">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input type="text" name="q" placeholder="Tìm kiếm tác phẩm..." />
            </label>
          </form>
        </div>
      </div>

      {/* Daily Work Banner */}
      {dailyWork && <DailyWorkBanner work={dailyWork} />}

      {/* Feed */}
      <div className="feed-layout" style={{ padding: '0', maxWidth: 'none' }}>
        {latest.map(work => (
          <article key={work.id} className="feed-card">
            <div className="feed-card__header">
              <span className="feed-card__genre">{getLabel(work.genre)}</span>
              {work.isFeatured && <span className="poem-card__star">Nổi bật</span>}
              {work.publishedAt && <span className="feed-card__date">{work.publishedAt.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
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
                {work.tags.slice(0, 3).map(wt => <Link key={wt.tagId} href={`/tac-pham?tag=${wt.tag.slug}`} className="tag-pill">{wt.tag.name}</Link>)}
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  )
}
