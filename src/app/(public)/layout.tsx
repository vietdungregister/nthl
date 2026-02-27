import { prisma } from '@/lib/db'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import SidebarNav from '@/components/SidebarNav'
import { Suspense } from 'react'

// force-dynamic: bắt buộc Next.js render layout này ở server-side mỗi request,
// không prerender static HTML lúc build. Cần thiết để Docker build thành công
// vì lúc build không có database thực sự.
export const dynamic = 'force-dynamic'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [author, dbGenres, genreCounts, books, collections] = await Promise.all([
    prisma.authorProfile.findFirst(),
    prisma.genre.findMany({ where: { showInSidebar: true }, orderBy: { order: 'asc' } }),
    prisma.work.groupBy({ by: ['genre'], where: { status: 'published', deletedAt: null }, _count: true }),
    prisma.book.findMany({ orderBy: [{ order: 'asc' }, { year: 'desc' }], select: { id: true, slug: true, title: true, publisher: true, year: true, coverImage: true } }),
    prisma.collection.findMany({ orderBy: { order: 'asc' }, include: { _count: { select: { works: true } } } }),
  ])

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
              genres={dbGenres}
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
