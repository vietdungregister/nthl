import { prisma } from '@/lib/db'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Sách' }

export default async function SachPage() {
    const books = await prisma.book.findMany({ orderBy: [{ order: 'asc' }, { year: 'desc' }] })

    return (
        <>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, paddingTop: 12 }}>
                📕 Sách đã xuất bản
            </h2>
            {books.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Chưa có sách nào.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {books.map((book: { id: string; slug: string; title: string; publisher?: string | null; year?: number | null; description?: string | null; coverImage?: string | null }) => (
                        <Link key={book.id} href={`/sach/${book.slug}`} style={{ textDecoration: 'none' }}>
                            <div className="feed-card" style={{ display: 'flex', gap: 24, cursor: 'pointer' }}>
                                {book.coverImage && (
                                    <img src={book.coverImage} alt={book.title} style={{ width: 100, height: 140, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                                )}
                                <div>
                                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{book.title}</div>
                                    {(book.publisher || book.year) && (
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                                            {book.publisher}{book.publisher && book.year ? ' · ' : ''}{book.year}
                                        </div>
                                    )}
                                    {book.description && (
                                        <div style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{book.description}</div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </>
    )
}
