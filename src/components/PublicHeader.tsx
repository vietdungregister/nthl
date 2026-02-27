'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function PublicHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="pub-header">
      <div className="pub-header-inner">
        <Link href="/" className="pub-logo">Nguyễn Thế Hoàng Linh</Link>

        {/* Desktop nav */}
        <nav className="pub-nav" aria-label="Navigation">
          <Link href="/tac-pham">Tác phẩm</Link>
          <Link href="/gioi-thieu">Giới thiệu</Link>
          <Link href="/tim-kiem" className="nav-ai-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
            Hỏi AI
          </Link>
        </nav>

        {/* Mobile hamburger button */}
        <button
          className="pub-nav-toggle"
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="pub-nav-mobile" aria-label="Mobile navigation">
          <Link href="/tac-pham" onClick={() => setOpen(false)}>Tác phẩm</Link>
          <Link href="/gioi-thieu" onClick={() => setOpen(false)}>Giới thiệu</Link>
          <Link href="/tim-kiem" className="nav-ai-btn" onClick={() => setOpen(false)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
            Hỏi AI
          </Link>
        </nav>
      )}
    </header>
  )
}
