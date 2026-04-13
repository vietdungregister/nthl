'use client'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRef, FormEvent } from 'react'

interface Genre { value: string; label: string; emoji: string }
interface GenreCount { genre: string; _count: number }
interface Book { id: string; slug: string; title: string; buyUrl?: string | null }
interface RecentWork { id: string; title: string; slug: string }

interface Props {
  genres: Genre[]
  genreCounts: GenreCount[]
  books: Book[]
  totalAllWorks: number
  recentWorks: RecentWork[]
}

/* Label overrides */
const LABEL_MAP: Record<string, string> = {
  stt: 'Status',
}
/* Genres to hide from sidebar */
const HIDE_GENRES = new Set(['essay', 'children'])

const S = {
  nav: { display: 'flex', flexDirection: 'column' as const, gap: 0 },
  section: { paddingTop: 14, marginBottom: 16 },
  label: {
    fontFamily: "var(--font-inter), 'Inter', sans-serif",
    fontSize: 10, fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase' as const,
    color: 'var(--text-muted)', marginBottom: 10,
  },
  /* 3-column grid for equal-sized chips */
  genreGrid: {
    listStyle: 'none', padding: 0, margin: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 5,
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    padding: '0 4px',
    fontFamily: "var(--font-noto-serif), 'Noto Serif', serif",
    fontSize: 11, lineHeight: 1.2,
    color: 'var(--text-muted)',
    textDecoration: 'none',
    textAlign: 'center' as const,
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.15s',
  },
  chipActive: {
    color: 'var(--accent)',
    borderColor: 'rgba(196,164,109,0.3)',
    background: 'rgba(196,164,109,0.06)',
    fontWeight: 600,
  },
  recentList: { listStyle: 'none', padding: 0, margin: 0 },
  recentItem: {
    display: 'block', padding: '7px 0',
    fontFamily: "var(--font-noto-serif), 'Noto Serif', serif",
    fontSize: 12, lineHeight: 1.4,
    color: 'var(--text-secondary)', textDecoration: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const, textOverflow: 'ellipsis' as const,
  },
  viewAll: {
    display: 'block', padding: '8px 0 0',
    fontFamily: "var(--font-inter), 'Inter', sans-serif",
    fontSize: 11, color: 'var(--text-muted)',
    textDecoration: 'none', fontStyle: 'italic' as const,
  },
}

export default function SidebarNav({ genres, recentWorks }: Props) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)
  const currentGenre = searchParams.get('genre')
  const isTacPham = pathname === '/tac-pham' || pathname === '/'

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const q = searchRef.current?.value.trim()
    if (q) router.push(`/tim-kiem?q=${encodeURIComponent(q)}`)
  }

  const allGenres = [
    { value: '', label: 'Tất cả' },
    ...genres
      .filter(g => !HIDE_GENRES.has(g.value))
      .map(g => ({ value: g.value, label: LABEL_MAP[g.value] || g.label })),
  ]

  return (
    <nav style={S.nav} aria-label="Điều hướng thể loại">
      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: 14 }}>
        <input
          ref={searchRef}
          type="text"
          placeholder="Tìm kiếm..."
          style={{
            width: '100%', background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--border)', borderRadius: 0,
            padding: '6px 0', fontFamily: "var(--font-noto-serif), 'Noto Serif', serif",
            fontSize: 13, color: 'var(--text-secondary)', outline: 'none',
          }}
          aria-label="Tìm kiếm tác phẩm"
        />
      </form>

      <div style={S.section}>
        <p style={S.label}>Thể loại</p>
        <ul style={S.genreGrid}>
          {allGenres.map(g => {
            const isActive = g.value === ''
              ? (isTacPham && !currentGenre)
              : currentGenre === g.value
            return (
              <li key={g.value || '_all'}>
                <Link
                  href={g.value ? `/tac-pham?genre=${g.value}` : '/tac-pham'}
                  style={{ ...S.chip, ...(isActive ? S.chipActive : {}) }}
                >
                  {g.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {recentWorks.length > 0 && (
        <div style={{ ...S.section, borderTop: '1px solid var(--border)' }}>
          <p style={S.label}>Mới nhất</p>
          <ul style={S.recentList}>
            {recentWorks.map(w => (
              <li key={w.id}>
                <Link href={`/tac-pham/${w.slug}`} style={S.recentItem} title={w.title}>
                  {w.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/tac-pham" style={S.viewAll}>Xem tất cả →</Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  )
}
