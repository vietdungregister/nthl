import { getCachedAuthorProfile, getCachedGenres, getCachedGenreCounts, getCachedBooks, getCachedRecentWorks } from '@/lib/cache'
import PublicHeader from '@/components/PublicHeader'
import SidebarNav from '@/components/SidebarNav'
import { Suspense } from 'react'

// Cache tất cả sidebar data — revalidate qua tags khi admin thay đổi
export const revalidate = 300 // ISR 5 phút

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [author, dbGenres, genreCounts, books, recentWorks] = await Promise.all([
    getCachedAuthorProfile(),
    getCachedGenres(),
    getCachedGenreCounts(),
    getCachedBooks(),
    getCachedRecentWorks(),
  ])

  // Hardcoded special genres — ALWAYS present regardless of DB
  const HARDCODED_GENRES = [
    { value: 'photo', label: 'Ảnh', emoji: '📷', order: 90 },
    { value: 'video', label: 'Video', emoji: '🎬', order: 91 },
  ]
  const existingValues = new Set(dbGenres.map((g: { value: string }) => g.value))
  const mergedGenres = [
    ...dbGenres,
    ...HARDCODED_GENRES.filter(g => !existingValues.has(g.value)),
  ]

  const totalAllWorks = genreCounts.reduce((s: number, g: { _count: number }) => s + g._count, 0)

  return (
    <div className="public-shell">
      <PublicHeader />

      <div className="page-layout">
        {/* LEFT SIDEBAR */}
        <aside className="works-sidebar">
          <div className="works-sidebar__author">
            {author?.avatarUrl ? (
              <img src={author.avatarUrl} alt={author.name} className="works-sidebar__avatar-img" />
            ) : (
              <div className="works-sidebar__avatar">N</div>
            )}
            <p className="works-sidebar__name">{author?.name || 'Nguyễn Thế Hoàng Linh'}</p>
            <p className="works-sidebar__bio">{author?.bioShort || 'Nhà thơ · Hà Nội'}</p>
          </div>
          <div className="works-sidebar__divider" />
          <Suspense fallback={null}>
          <SidebarNav
              genres={mergedGenres}
              genreCounts={genreCounts}
              books={books}
              totalAllWorks={totalAllWorks}
              recentWorks={recentWorks}
            />
          </Suspense>
        </aside>

        {/* CENTER */}
        <div className="page-feed">
          {children}
        </div>

        {/* RIGHT SIDEBAR — QR + Books */}
        <aside className="home-right-sidebar">
          {/* QR Donate */}
          <div className="sidebar-qr">
            <img
              src="/qr-donate.jpg"
              alt="QR ủng hộ tác giả Nguyễn Thế Hoàng Linh"
              className="sidebar-qr__img"
            />
            <span className="sidebar-qr__label">Ủng hộ tác giả</span>
          </div>

          {/* Book List */}
          {books.length > 0 && (
            <div className="sidebar-books">
              <h3 className="sidebar-books__title">Sách</h3>
              <ul className="sidebar-books__list">
                {books.map((book: { id: string; slug: string; title: string; buyUrl: string | null }) => (
                  <li key={book.id}>
                    <a
                      href={book.buyUrl || `/sach/${book.slug}`}
                      target={book.buyUrl ? '_blank' : '_self'}
                      rel={book.buyUrl ? 'noopener noreferrer' : undefined}
                      className="sidebar-books__link"
                    >
                      <span>{book.title}</span>
                      {book.buyUrl && <span className="sidebar-books__arrow">→</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <footer className="pub-footer">
        <p>© 2026 Nguyễn Thế Hoàng Linh
          <a href="https://facebook.com/nguyenthehoanglinh" target="_blank" rel="noopener noreferrer">Facebook</a>
        </p>
      </footer>
    </div>
  )
}
