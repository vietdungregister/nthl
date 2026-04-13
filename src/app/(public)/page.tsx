import { prisma } from '@/lib/db'
import { cleanTitle, fixSplitVietnamese } from '@/lib/utils'
import Link from 'next/link'
import PoemTheater from '@/components/public/PoemTheater'

export const dynamic = 'force-dynamic'

/** Strip title from start of content if present */
function stripTitle(content: string, title: string): string {
  const normalized = content.trimStart()
  if (normalized.toLowerCase().startsWith(title.toLowerCase())) {
    return normalized.slice(title.length).replace(/^[\s\n]+/, '')
  }
  return normalized
}

export default async function HomePage() {
  type TheaterWork = { id: string; title: string; slug: string; genre: string; content: string; writtenAt: Date | null }
  const [total, theaterRows] = await Promise.all([
    prisma.work.count({ where: { status: 'published', deletedAt: null } }).catch(() => 0),
    prisma.$queryRaw<TheaterWork[]>`
      SELECT id, title, slug, genre, LEFT(content, 8000) AS content, "writtenAt"
      FROM "Work"
      WHERE status = 'published'
        AND "deletedAt" IS NULL
        AND title IS NOT NULL AND title != ''
        AND content IS NOT NULL AND LENGTH(content) > 50
        AND LENGTH(content) < 1500
        AND genre = 'poem'
      ORDER BY RANDOM()
      LIMIT 1
    `.catch(() => [] as TheaterWork[]),
  ])

  const genreLabels: Record<string, string> = {
    poem: 'Thơ', essay: 'Tản văn', short_story: 'Truyện ngắn', memoir: 'Hồi ký', stt: 'Status',
  }

  const rawTheater = theaterRows[0] ?? null
  const initialWork = rawTheater ? {
    id: rawTheater.id,
    title: cleanTitle(rawTheater.title),
    slug: rawTheater.slug,
    genre: rawTheater.genre,
    genreLabel: genreLabels[rawTheater.genre] ?? rawTheater.genre,
    content: stripTitle(rawTheater.content, rawTheater.title)
      .split('\n').map((l: string) => fixSplitVietnamese(l)).join('\n'),
    lineCount: rawTheater.content.split('\n').filter((l: string) => l.trim()).length,
    writtenAt: rawTheater.writtenAt ? new Date(rawTheater.writtenAt).toISOString().slice(0, 10) : null,
  } : null

  return (
    <>
      {/* ── THEATER SECTION (full-height hero) ── */}
      {initialWork && <PoemTheater initialWork={initialWork} />}

      {/* ── Minimal CTA below theater ── */}
      <div style={{
        textAlign: 'center',
        padding: '48px 20px 64px',
        borderTop: '1px solid var(--border)',
      }}>
        <p style={{
          fontFamily: "var(--font-inter), 'Inter', sans-serif",
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 16,
        }}>
          {total.toLocaleString('vi-VN')} tác phẩm trong kho lưu trữ
        </p>
        <Link
          href="/tac-pham"
          style={{
            display: 'inline-block',
            fontFamily: "var(--font-noto-serif), 'Noto Serif', serif",
            fontSize: 15,
            color: 'var(--accent)',
            textDecoration: 'none',
            borderBottom: '1px solid rgba(196,164,109,0.3)',
            paddingBottom: 2,
            transition: 'border-color 0.2s',
          }}
        >
          Xem toàn bộ tác phẩm →
        </Link>
      </div>
    </>
  )
}
