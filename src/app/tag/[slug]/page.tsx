import { prisma } from '@/lib/db'
import Link from 'next/link'
import { getGenreLabel } from '@/lib/utils'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const tag = await prisma.tag.findUnique({ where: { slug } }); return tag ? { title: `#${tag.name}` } : {} }

export default async function TagPage({ params }: Props) {
    const { slug } = await params
    const tag = await prisma.tag.findUnique({ where: { slug } })
    if (!tag) notFound()
    const works = await prisma.work.findMany({ where: { status: 'published', deletedAt: null, tags: { some: { tagId: tag.id } } }, orderBy: { publishedAt: 'desc' } })

    return (
        <div className="public-shell">
            <header className="pub-header">
                <div className="pub-header-inner">
                    <Link href="/" className="pub-logo">Nguyễn Thế Hoàng Linh</Link>
                    <nav className="pub-nav"><Link href="/tac-pham">Tác phẩm</Link><Link href="/gioi-thieu">Giới thiệu</Link></nav>
                </div>
            </header>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px 0' }}>
                <Link href="/tac-pham" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Tác phẩm</Link>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: 'var(--text-primary)', marginTop: 12 }}>{tag.name}</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>{works.length} tác phẩm</p>
            </div>
            <div className="works-grid">
                {works.map(w => (
                    <Link key={w.id} href={`/tac-pham/${w.slug}`} className="poem-card">
                        <div className="poem-card__genre">{getGenreLabel(w.genre)}</div>
                        <div className="poem-card__title">{w.title}</div>
                        <div className="poem-card__excerpt">{w.excerpt || w.content.slice(0, 100)}</div>
                    </Link>
                ))}
            </div>
            <footer className="pub-footer"><p>© 2026 Nguyễn Thế Hoàng Linh</p></footer>
        </div>
    )
}
