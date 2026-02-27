'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DailyWork {
    id: string
    title: string | null
    slug: string
    genre: string
    content: string | null
    genreLabel: string
}

const OPT_OUT_KEY = 'daily-banner-opt-out'

export default function DailyWorkBanner({ work }: { work: DailyWork }) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        // Only skip if user has permanently opted out
        const optedOut = localStorage.getItem(OPT_OUT_KEY)
        if (!optedOut) setVisible(true)
    }, [])

    // Lock body scroll when modal is open
    useEffect(() => {
        if (visible) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [visible])

    function dismiss() {
        setVisible(false)
    }

    function optOut() {
        localStorage.setItem(OPT_OUT_KEY, '1')
        setVisible(false)
    }

    if (!visible) return null

    // Keep poem line-breaks; for prose, collapse to short excerpt
    const rawContent = work.content?.trim() ?? ''
    const isPoem = work.genre === 'poem'
    const excerpt = isPoem
        ? rawContent.split('\n').slice(0, 8).join('\n')
        : rawContent.replace(/\n+/g, ' ').slice(0, 280).trimEnd() + (rawContent.length > 280 ? '…' : '')

    return (
        <>
            {/* Backdrop — click to close */}
            <div className="daily-modal-backdrop" onClick={dismiss} aria-hidden="true" />

            {/* Modal card */}
            <div className="daily-modal" role="dialog" aria-modal="true" aria-label="Tác phẩm ngẫu nhiên">
                {/* Decorative quote top-left */}
                <span className="daily-modal__deco" aria-hidden="true">&ldquo;</span>
                {/* Decorative quote bottom-right */}
                <span className="daily-modal__deco daily-modal__deco--close" aria-hidden="true">&rdquo;</span>

                <div className="daily-modal__body">
                    <span className="daily-modal__genre">{work.genreLabel}</span>

                    {work.title && (
                        <Link href={`/tac-pham/${work.slug}`} className="daily-modal__title" onClick={dismiss}>
                            {work.title}
                        </Link>
                    )}

                    {excerpt && (
                        <p className={isPoem ? 'daily-modal__poem' : 'daily-modal__excerpt'}>
                            {excerpt}
                        </p>
                    )}

                    <div className="daily-modal__actions">
                        <Link href={`/tac-pham/${work.slug}`} className="daily-modal__read-link" onClick={dismiss}>
                            Đọc toàn bộ <span aria-hidden="true">→</span>
                        </Link>
                        <button onClick={optOut} className="daily-modal__opt-out">
                            Không hiển thị nữa
                        </button>
                    </div>
                </div>

                {/* Close button */}
                <button onClick={dismiss} className="daily-modal__close" aria-label="Đóng" title="Đóng">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="1" y1="1" x2="13" y2="13" />
                        <line x1="13" y1="1" x2="1" y2="13" />
                    </svg>
                </button>
            </div>
        </>
    )
}
