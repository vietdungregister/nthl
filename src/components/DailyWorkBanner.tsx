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

/** Strip title from start of content (nhiều bài import bắt đầu bằng chính tên bài) */
function stripTitle(content: string, title: string | null): string {
    if (!title) return content
    const normalized = content.trimStart()
    // Nếu content bắt đầu bằng title (case-insensitive), bỏ đi
    if (normalized.toLowerCase().startsWith(title.toLowerCase())) {
        return normalized.slice(title.length).replace(/^[\s\n]+/, '')
    }
    return normalized
}

/** Format excerpt cho popup */
function formatExcerpt(rawContent: string, title: string | null, genre: string): string {
    const content = stripTitle(rawContent, title)
    const isPoem = genre === 'poem'

    if (isPoem) {
        // Thơ: giữ line breaks, lấy tối đa 10 dòng không rỗng
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
        const preview = lines.slice(0, 10).join('\n')
        return lines.length > 10 ? preview + '\n…' : preview
    } else {
        // Văn xuôi: lấy tối đa 2 đoạn đầu
        const paragraphs = content.split(/\n\s*\n/).map(p => p.replace(/\n+/g, ' ').trim()).filter(Boolean)
        const preview = paragraphs.slice(0, 2).join('\n\n')
        const MAX = 320
        if (preview.length <= MAX) return paragraphs.length > 2 ? preview + '\n\n…' : preview
        return preview.slice(0, MAX).trimEnd() + '…'
    }
}

export default function DailyWorkBanner({ work }: { work: DailyWork }) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const optedOut = localStorage.getItem(OPT_OUT_KEY)
        if (!optedOut) {
            // Nhỏ delay để tránh flash ngay khi load
            const t = setTimeout(() => setVisible(true), 600)
            return () => clearTimeout(t)
        }
    }, [])

    useEffect(() => {
        if (visible) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [visible])

    function dismiss() { setVisible(false) }
    function optOut() { localStorage.setItem(OPT_OUT_KEY, '1'); setVisible(false) }

    if (!visible) return null

    const rawContent = work.content?.trim() ?? ''
    const isPoem = work.genre === 'poem'
    const excerpt = formatExcerpt(rawContent, work.title, work.genre)

    return (
        <>
            {/* Backdrop */}
            <div className="daily-modal-backdrop" onClick={dismiss} aria-hidden="true" />

            {/* Modal */}
            <div className="daily-modal" role="dialog" aria-modal="true" aria-label="Tác phẩm ngẫu nhiên">
                <span className="daily-modal__deco" aria-hidden="true">&ldquo;</span>
                <span className="daily-modal__deco daily-modal__deco--close" aria-hidden="true">&rdquo;</span>

                <div className="daily-modal__body">
                    <span className="daily-modal__genre">{work.genreLabel}</span>

                    {work.title && (
                        <Link href={`/tac-pham/${work.slug}`} className="daily-modal__title" onClick={dismiss}>
                            {work.title}
                        </Link>
                    )}

                    {excerpt && (
                        <div className={isPoem ? 'daily-modal__poem' : 'daily-modal__excerpt'}>
                            {isPoem
                                ? excerpt.split('\n').map((line, i) => (
                                    <span key={i}>
                                        {line || <>&nbsp;</>}
                                        <br />
                                    </span>
                                ))
                                : excerpt.split('\n\n').map((para, i) => (
                                    <p key={i} style={{ margin: i > 0 ? '0.75em 0 0' : '0' }}>{para}</p>
                                ))
                            }
                        </div>
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
