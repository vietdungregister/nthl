import { prisma } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const book = await prisma.book.findUnique({ where: { slug } })
    if (!book) return {}
    return { title: book.title, description: book.description || `${book.title} — sách đã xuất bản` }
}

export default async function BookDetailPage({ params }: Props) {
    const { slug } = await params
    const book = await prisma.book.findUnique({ where: { slug } })
    if (!book) notFound()

    return (
        <div className="public-shell">
            <header className="pub-header">
                <div className="pub-header-inner">
                    <Link href="/" className="pub-logo">Nguyễn Thế Hoàng Linh</Link>
                    <nav className="pub-nav">
                        <Link href="/tac-pham">Tác phẩm</Link>
                        <Link href="/sach">Sách</Link>
                        <Link href="/gioi-thieu">Giới thiệu</Link>
                        <Link href="/tim-kiem" className="nav-ai-btn">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                            </svg>
                            Hỏi AI
                        </Link>
                    </nav>
                </div>
            </header>

            <div className="book-detail">
                <Link href="/sach" className="reading-back">← Sách</Link>

                <div className="book-detail__hero">
                    {book.coverImage && (
                        <div className="book-detail__cover">
                            <img src={book.coverImage} alt={book.title} />
                        </div>
                    )}
                    <div className="book-detail__info">
                        <h1 className="book-detail__title">{book.title}</h1>
                        <div className="book-detail__meta">
                            {book.publisher && (
                                <div className="book-detail__meta-item">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                                    <span><strong>Nhà xuất bản:</strong> {book.publisher}</span>
                                </div>
                            )}
                            {book.year && (
                                <div className="book-detail__meta-item">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>
                                    <span><strong>Năm xuất bản:</strong> {book.year}</span>
                                </div>
                            )}
                        </div>
                        {book.description && (
                            <div className="book-detail__description">
                                <p>{book.description}</p>
                            </div>
                        )}
                        {book.buyUrl && (
                            <a href={book.buyUrl} target="_blank" rel="noopener noreferrer" className="book-detail__buy-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                                </svg>
                                Mua sách
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <footer className="pub-footer">
                <p>© 2026 Nguyễn Thế Hoàng Linh
                    <a href="https://facebook.com/nguyenthehoanglinh" target="_blank" rel="noopener noreferrer">Facebook</a>
                </p>
            </footer>
        </div>
    )
}
