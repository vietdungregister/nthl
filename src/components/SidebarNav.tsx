'use client'
import { useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import SachAccordion from '@/components/SachAccordion'

interface Genre { value: string; label: string; emoji: string }
interface GenreCount { genre: string; _count: number }
interface Book { id: string; slug: string; title: string; publisher?: string | null; year?: number | null; coverImage?: string | null }

interface Props {
  genres: Genre[]
  genreCounts: GenreCount[]
  books: Book[]
  totalAllWorks: number
}

export default function SidebarNav({ genres, genreCounts, books, totalAllWorks }: Props) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const currentGenre = searchParams.get('genre')

  const getLabel = (val: string) => genres.find(g => g.value === val)?.label ?? val
  const getEmoji = (val: string) => genres.find(g => g.value === val)?.emoji ?? '📝'

  const isTacPham = pathname === '/tac-pham' || pathname === '/'
  const isSach = pathname.startsWith('/sach')

  return (
    <nav className="works-sidebar__nav" aria-label="Lọc theo thể loại">
      <Link href="/tac-pham" className={`works-sidebar__nav-item${isTacPham && !currentGenre ? ' active' : ''}`}>
        <span>📋 Tất cả</span>
        <span className="works-sidebar__count">{totalAllWorks}</span>
      </Link>
      {genres.map(g => {
        const count = genreCounts.find(gc => gc.genre === g.value)?._count ?? 0
        return (
          <Link key={g.value} href={`/tac-pham?genre=${g.value}`}
            className={`works-sidebar__nav-item${currentGenre === g.value ? ' active' : ''}`}>
            <span>{g.emoji} {g.label}</span>
            <span className="works-sidebar__count">{count}</span>
          </Link>
        )
      })}
      <SachAccordion books={books} isActive={isSach} />
    </nav>
  )
}
