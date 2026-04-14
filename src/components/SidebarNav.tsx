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
const LABEL_MAP: Record<string, string> = { stt: 'Status' }
/* Genres to hide from sidebar */
const HIDE_GENRES = new Set(['essay', 'children'])

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
    <nav className="snav" aria-label="Điều hướng thể loại">
      {/* Search — prominent box like mini-app */}
      <form onSubmit={handleSearch} className="snav__search-form">
        <input
          ref={searchRef}
          type="text"
          placeholder="Tìm kiếm tác phẩm..."
          className="search-box"
          aria-label="Tìm kiếm tác phẩm"
        />
      </form>

      {/* Genre chips */}
      <div className="snav__section">
        <p className="meta" style={{ marginBottom: 10 }}>Thể loại</p>
        <ul className="snav__genre-grid">
          {allGenres.map(g => {
            const isActive = g.value === ''
              ? (isTacPham && !currentGenre)
              : currentGenre === g.value
            return (
              <li key={g.value || '_all'}>
                <Link
                  href={g.value ? `/tac-pham?genre=${g.value}` : '/tac-pham'}
                  className={`snav__genre-chip${isActive ? ' snav__genre-chip--active' : ''}`}
                >
                  {g.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {recentWorks.length > 0 && (
        <div className="snav__section">
          <p className="meta" style={{ marginBottom: 10 }}>Mới nhất</p>
          <ul className="snav__list">
            {recentWorks.map(w => (
              <li key={w.id}>
                <Link href={`/tac-pham/${w.slug}`} className="snav__item" title={w.title}>
                  {w.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/tac-pham" className="snav__item snav__item--viewall">Xem tất cả →</Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  )
}
