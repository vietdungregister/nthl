'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'

// ---- Skeleton Loading ----------------------------------------------
function SearchSkeleton() {
    return (
        <div className="search-skeleton">
            <div className="search-skeleton__label">
                <span className="search-skeleton__dot">
                    <span /><span /><span />
                </span>
                Đang tìm tác phẩm liên quan...
            </div>
            {[0, 1, 2, 3].map(i => (
                <div key={i} className="search-skeleton__card">
                    <div className="search-skeleton__line search-skeleton__line--badge" />
                    <div className="search-skeleton__line search-skeleton__line--title" />
                    <div className="search-skeleton__line" />
                    <div className="search-skeleton__preview" />
                </div>
            ))}
        </div>
    )
}

const STORAGE_KEY = 'ai-lib-state'
const TTL_MS = 15 * 60 * 1000

interface AIWork {
    id: string
    title: string
    slug: string
    genre: string
    preview_sentences: string[]
    publishedAt: string | null
    writtenAt: string | null
}

interface AISearchResult {
    works: AIWork[]
}

const GENRE_LABELS: Record<string, string> = {
    poem: 'Thơ',
    prose: 'Tùy bút',
    photo: 'Ảnh',
    video: 'Video',
}

const PAGE_SIZE = 10

export default function AILibrarian() {
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<AISearchResult | null>(null)

    // Stable random sentence per work — chỉ chọn lại khi result thay đổi, không re-random khi typing
    const stablePreview = useMemo(() => {
        if (!result) return new Map<string, string>()
        const map = new Map<string, string>()
        result.works.forEach(w => {
            const sents = w.preview_sentences || []
            map.set(w.id, sents.length > 0 ? sents[Math.floor(Math.random() * sents.length)] : '')
        })
        return map
    }, [result])
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [filterYear, setFilterYear] = useState<string>('')
    const [filterMonth, setFilterMonth] = useState<string>('')
    const [filterDay, setFilterDay] = useState<string>('')
    const resultRef = useRef<HTMLDivElement>(null)
    const initialized = useRef(false)

    // Restore from sessionStorage — chỉ restore query/filters, auto re-search
    useEffect(() => {
        if (initialized.current) return
        initialized.current = true
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY)
            if (saved) {
                const s = JSON.parse(saved)
                if (s.expiry && Date.now() > s.expiry) {
                    sessionStorage.removeItem(STORAGE_KEY)
                    return
                }
                if (s.query) {
                    setQuery(s.query)
                    if (s.filterYear) setFilterYear(s.filterYear)
                    if (s.filterMonth) setFilterMonth(s.filterMonth)
                    if (s.filterDay) setFilterDay(s.filterDay)
                    if (s.page) setPage(s.page)
                    // Auto re-search để lấy lại kết quả
                    doSearch(s.query)
                }
            }
        } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Chỉ lưu query + filters (KHÔNG lưu results)
    useEffect(() => {
        if (!result) {
            sessionStorage.removeItem(STORAGE_KEY)
            return
        }
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                query, page, filterYear, filterMonth, filterDay,
                expiry: Date.now() + TTL_MS,
            }))
        } catch { /* ignore */ }
    }, [result, page, query, filterYear, filterMonth, filterDay])

    async function doSearch(q: string) {
        if (!q.trim() || loading) return
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const res = await fetch('/api/ai-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: q.trim() }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Có lỗi xảy ra.'); return }
            setResult(data)
            setTimeout(() => {
                resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 100)
        } catch {
            setError('Không kết nối được với thủ thư. Thử lại sau nhé.')
        } finally {
            setLoading(false)
        }
    }

    function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault()
        setPage(1)
        doSearch(query)
    }

    // Filter client-side theo năm/tháng/ngày
    const filteredWorks = result?.works.filter(w => {
        const dateStr = w.writtenAt || w.publishedAt
        if (!dateStr) return !filterYear && !filterMonth && !filterDay
        const d = new Date(dateStr)
        if (filterYear && d.getFullYear() !== parseInt(filterYear)) return false
        if (filterMonth && d.getMonth() + 1 !== parseInt(filterMonth)) return false
        if (filterDay && d.getDate() !== parseInt(filterDay)) return false
        return true
    }) || []

    const totalWorks = filteredWorks.length
    const totalPages = Math.ceil(totalWorks / PAGE_SIZE)
    const pagedWorks = filteredWorks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function goToPage(p: number) {
        setPage(p)
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    return (
        <section className="ai-lib" aria-label="Thủ Thư AI">
            {/* Section header */}
            <div className="ai-lib__header">
                <div className="ai-lib__title-row">
                    <svg className="ai-lib__title-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    <h2 className="ai-lib__title">Thủ Thư AI</h2>
                </div>
                <p className="ai-lib__desc">
                    Hãy nói điều bạn đang tìm kiếm — thủ thư sẽ gợi ý tác phẩm phù hợp.
                </p>
            </div>

            {/* Input form */}
            <form onSubmit={handleSubmit} className="ai-lib__form">
                <div className="ai-lib__textarea-wrap">
                    <textarea
                        className="ai-lib__textarea"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder=""
                        rows={3}
                        maxLength={500}
                        disabled={loading}
                        aria-label="Nhập yêu cầu tìm kiếm"
                        onKeyDown={e => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault()
                                handleSubmit()
                            }
                        }}
                    />
                </div>

                <div className="ai-lib__form-footer">
                    <span className="ai-lib__char-count" aria-live="polite">
                        {query.length}/500
                    </span>
                    <button
                        type="submit"
                        className="ai-lib__btn"
                        disabled={loading || !query.trim()}
                        aria-busy={loading}
                    >
                        {loading ? (
                            <>
                                <span className="ai-lib__spinner" aria-hidden="true" />
                                Đang tìm...
                            </>
                        ) : (
                            <>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <polygon points="22 3 2 12 11 14" />
                                    <polygon points="11 14 13 22 22 3" />
                                </svg>
                                Hỏi thủ thư
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Error */}
            {error && (
                <div className="ai-lib__error" role="alert">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Skeleton loading */}
            {loading && !result && <SearchSkeleton />}

            {/* Result */}
            {result && (
                <div className="ai-lib__result" ref={resultRef} aria-live="polite">
                    {/* Summary bar + Year filter */}
                    {result.works.length > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            flexWrap: 'wrap', gap: 8,
                            padding: '10px 0 14px', borderBottom: '1px solid var(--border)',
                            marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)',
                            fontFamily: "'Inter', sans-serif",
                        }}>
                            <span>
                                Tìm thấy <strong style={{ color: 'var(--accent)' }}>{totalWorks}</strong>
                                {filterYear || filterMonth || filterDay
                                    ? ` bài${filterDay ? ` ngày ${filterDay}` : ''}${filterMonth ? `/${filterMonth}` : ''}${filterYear ? `/${filterYear}` : ''}`
                                    : ' tác phẩm liên quan'}
                                {totalPages > 1 && <> · Trang {page}/{totalPages}</>}
                            </span>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {/* Năm */}
                                <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterMonth(''); setFilterDay(''); setPage(1) }}
                                    style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <option value=''>Tất cả năm</option>
                                    {Array.from({ length: 18 }, (_, i) => 2026 - i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                {/* Tháng */}
                                <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterDay(''); setPage(1) }}
                                    style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <option value=''>Tất cả tháng</option>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>Tháng {m}</option>
                                    ))}
                                </select>
                                {/* Ngày */}
                                <select value={filterDay} onChange={e => { setFilterDay(e.target.value); setPage(1) }}
                                    style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <option value=''>Tất cả ngày</option>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                        <option key={d} value={d}>Ngày {d}</option>
                                    ))}
                                </select>
                                {/* Reset */}
                                {(filterYear || filterMonth || filterDay) && (
                                    <button onClick={() => { setFilterYear(''); setFilterMonth(''); setFilterDay(''); setPage(1) }}
                                        style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                        × Xóa lọc
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Work cards */}
                    {pagedWorks.length > 0 ? (
                        <div className="ai-lib__works">
                            {pagedWorks.map((work, idx) => {
                                const sentence = stablePreview.get(work.id) || ''
                                return (
                                <Link
                                    key={work.id}
                                    href={`/tac-pham/${work.slug}`}
                                    className="poem-card ai-lib__work-card"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                        <span className="poem-card__genre">
                                            {GENRE_LABELS[work.genre] ?? work.genre}
                                        </span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" }}>
                                            #{(page - 1) * PAGE_SIZE + idx + 1}
                                        </span>
                                        {(() => { const d = work.writtenAt || work.publishedAt; return d && (
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif", marginLeft: 'auto' }}>
                                                {new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </span>
                                        )})()}
                                    </div>
                                    {work.title && (
                                        <div style={{
                                            fontFamily: "'Playfair Display', serif",
                                            fontSize: 16, fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            marginBottom: 8, lineHeight: 1.4,
                                        }}>
                                            {work.title}
                                        </div>
                                    )}
                                    {sentence && (
                                        <div style={{
                                            padding: '10px 14px',
                                            background: 'var(--accent-light)',
                                            borderRadius: 6,
                                            fontSize: 15,
                                            fontFamily: "'Lora', serif",
                                            color: 'var(--text-secondary)',
                                            fontStyle: 'italic',
                                            lineHeight: 1.7,
                                            borderLeft: '3px solid var(--accent)',
                                        }}>
                                            {sentence}
                                        </div>
                                    )}
                                </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="ai-lib__empty">
                            Không tìm thấy tác phẩm nào.
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            gap: 8, padding: '20px 0 8px',
                            fontFamily: "'Inter', sans-serif", fontSize: 13,
                        }}>
                            <button
                                onClick={() => goToPage(page - 1)}
                                disabled={page <= 1}
                                style={{
                                    padding: '6px 14px', borderRadius: 6,
                                    border: '1px solid var(--border)',
                                    background: page <= 1 ? 'transparent' : 'var(--card-bg)',
                                    color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                    cursor: page <= 1 ? 'default' : 'pointer',
                                    opacity: page <= 1 ? 0.4 : 1,
                                }}
                            >
                                ← Trước
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                                .map((p, idx, arr) => (
                                    <span key={p}>
                                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                                            <span style={{ color: 'var(--text-muted)', margin: '0 2px' }}>…</span>
                                        )}
                                        <button
                                            onClick={() => goToPage(p)}
                                            style={{
                                                padding: '6px 10px', borderRadius: 6,
                                                border: p === page ? '1px solid var(--accent)' : '1px solid var(--border)',
                                                background: p === page ? 'var(--accent)' : 'var(--card-bg)',
                                                color: p === page ? '#fff' : 'var(--text-primary)',
                                                cursor: 'pointer', fontWeight: p === page ? 600 : 400,
                                                minWidth: 34,
                                            }}
                                        >
                                            {p}
                                        </button>
                                    </span>
                                ))}

                            <button
                                onClick={() => goToPage(page + 1)}
                                disabled={page >= totalPages}
                                style={{
                                    padding: '6px 14px', borderRadius: 6,
                                    border: '1px solid var(--border)',
                                    background: page >= totalPages ? 'transparent' : 'var(--card-bg)',
                                    color: page >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                                    cursor: page >= totalPages ? 'default' : 'pointer',
                                    opacity: page >= totalPages ? 0.4 : 1,
                                }}
                            >
                                Tiếp →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
