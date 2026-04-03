import { getCachedAuthorProfile, getCachedGenres, getCachedGenreCounts, getCachedBooks, getCachedCollections } from '@/lib/cache'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import SidebarNav from '@/components/SidebarNav'
import { Suspense } from 'react'

// Cache tất cả sidebar data — revalidate qua tags khi admin thay đổi
// Không còn force-dynamic → Next.js có thể cache HTML output
export const revalidate = 300 // ISR 5 phút, đồng bộ với homepage

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Tất cả queries đã được cache (unstable_cache) — 0 DB round-trips khi cache warm
  const [author, dbGenres, genreCounts, books, collections] = await Promise.all([
    getCachedAuthorProfile(),
    getCachedGenres(),
    getCachedGenreCounts(),
    getCachedBooks(),
    getCachedCollections(),
  ])

  // Hardcoded special genres — ALWAYS present regardless of DB
  const HARDCODED_GENRES = [
    { value: 'photo', label: 'Ảnh', emoji: '📷', order: 90 },
    { value: 'video', label: 'Video', emoji: '🎬', order: 91 },
  ]
  // Merge: DB genres + hardcoded ones (skip if already in DB)
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
        {/* LEFT SIDEBAR — shared across all public pages */}
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
          {/* SidebarNav is client-side so it reads URL without server re-render */}
          <Suspense fallback={null}>
            <SidebarNav
              genres={mergedGenres}
              genreCounts={genreCounts}
              books={books}
              totalAllWorks={totalAllWorks}
            />
          </Suspense>
        </aside>

        {/* CENTER — page-specific content */}
        <div className="page-feed">
          {children}
        </div>

        {/* RIGHT SIDEBAR — Collections */}
        {collections.length > 0 && (
          <aside className="home-right-sidebar">
            <h3 className="home-right-sidebar__title">Bộ sưu tập</h3>
            <div className="home-right-sidebar__list">
              {collections.map((col: { id: string; slug: string; title: string; description: string | null; _count: { works: number } }) => (
                <Link key={col.id} href={`/bo-suu-tap/${col.slug}`} className="home-right-sidebar__item">
                  <div className="home-right-sidebar__item-title">{col.title}</div>
                  {col.description && <div className="home-right-sidebar__item-desc">{col.description}</div>}
                  <div className="home-right-sidebar__item-count">{col._count.works} tác phẩm</div>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>

      <footer className="pub-footer">
        <p>© 2026 Nguyễn Thế Hoàng Linh
          <a href="https://facebook.com/nguyenthehoanglinh" target="_blank" rel="noopener noreferrer">Facebook</a>
        </p>
      </footer>
    </div>
  )
}
