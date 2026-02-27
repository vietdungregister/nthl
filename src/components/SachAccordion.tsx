'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Book { id: string; slug: string; title: string; publisher?: string | null; year?: number | null; coverImage?: string | null }

interface Props {
    books: Book[]
    isActive: boolean
}

export default function SachAccordion({ books, isActive }: Props) {
    const [open, setOpen] = useState(false)

    return (
        <div>
            <button
                onClick={() => setOpen(o => !o)}
                className={`works-sidebar__nav-item${isActive ? ' active' : ''}`}
                style={{ width: '100%', textAlign: 'left', justifyContent: 'space-between' }}
                aria-expanded={open}
            >
                <span>📕 Sách</span>
                <span style={{
                    fontSize: 10,
                    opacity: 0.7,
                    transition: 'transform 0.2s',
                    display: 'inline-block',
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>▼</span>
            </button>

            {open && (
                <div style={{
                    marginTop: 4,
                    marginLeft: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.2s ease',
                }}>
                    {books.length === 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 12px' }}>Chưa có sách nào</span>
                    ) : (
                        books.map(book => (
                            <Link
                                key={book.id}
                                href={`/sach/${book.slug}`}
                                className="works-sidebar__nav-item"
                                style={{ fontSize: 13, padding: '8px 12px', background: 'rgba(255,255,255,0.3)' }}
                            >
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <span style={{ fontWeight: 600, lineHeight: 1.3 }}>{book.title}</span>
                                    {book.year && <span style={{ fontSize: 11, opacity: 0.65, fontWeight: 400 }}>{book.year}</span>}
                                </span>
                            </Link>
                        ))
                    )}
                    <Link href="/sach" className="works-sidebar__nav-item" style={{ fontSize: 12, color: 'var(--accent)', padding: '6px 12px', marginTop: 2 }}>
                        Xem tất cả →
                    </Link>
                </div>
            )}
        </div>
    )
}
