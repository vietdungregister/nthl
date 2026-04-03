'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ---- Types ---------------------------------------------------------
interface SearchWork {
    id: string
    title: string
    slug: string
    genre: string
    preview_sentences: string[]
    publishedAt: string | null
    writtenAt: string | null
}

const PAGE_SIZE = 20
const TTL_MS = 15 * 60 * 1000  // 15 phút

const GENRE_LABELS: Record<string, string> = {
    poem: 'Thơ', prose: 'Tùy bút', photo: 'Ảnh', video: 'Video',
}

// ---- Component -----------------------------------------------------
interface Props {
    children: React.ReactNode   // regular server-rendered list (shown when no search)
    defaultSearch?: string      // from URL ?search=
    genre?: string
    month?: number
    year?: number
}

export default function WorksSmartSearch({ children, defaultSearch, genre, month, year }: Props) {
    const storageKey = `works-smart-search:${genre || 'all'}`
    const [query, setQuery] = useState(defaultSearch || '')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<SearchWork[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [filterYear, setFilterYear] = useState<string>(year ? String(year) : '')
    const [filterMonth, setFilterMonth] = useState<string>(month ? String(month) : '')
    const [filterDay, setFilterDay] = useState<string>('')
    const resultRef = useRef<HTMLDivElement>(null)
    const initialized = useRef(false)

    // Restore from sessionStorage on mount — chỉ restore query/filters, tự re-search
    useEffect(() => {
        if (initialized.current) return
        initialized.current = true
        if (defaultSearch) {
            doSearch(defaultSearch)
            return
        }
        try {
            const saved = sessionStorage.getItem(storageKey)
            if (saved) {
                const s = JSON.parse(saved)
                // Kiểm tra TTL
                if (s.expiry && Date.now() > s.expiry) {
                    sessionStorage.removeItem(storageKey)
                    return
                }
                if (s.query) {
                    setQuery(s.query)
                    if (s.filterYear) setFilterYear(s.filterYear)
                    if (s.filterMonth) setFilterMonth(s.filterMonth)
                    if (s.filterDay) setFilterDay(s.filterDay)
                    if (s.page) setPage(s.page)
                    // Auto re-search để restore kết quả
                    doSearch(s.query)
                }
            }
        } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Chỉ lưu query + filters — KHÔNG lưu results (tiết kiệm memory)
    useEffect(() => {
        if (!results) {
            sessionStorage.removeItem(storageKey)
            return
        }
        try {
            sessionStorage.setItem(storageKey, JSON.stringify({
                query, page, filterYear, filterMonth, filterDay,
                expiry: Date.now() + TTL_MS,
            }))
        } catch { /* ignore */ }
    }, [results, query, page, filterYear, filterMonth, filterDay, storageKey])

    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) { setResults(null); return }
        setLoading(true)
        setError(null)
        setPage(1)
        try {
            const res = await fetch('/api/ai-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: q.trim(), genre }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Có lỗi xảy ra.'); return }
            setResults(data.works || [])
        } catch {
            setError('Không kết nối được. Thử lại sau nhé.')
        } finally {
            setLoading(false)
        }
    }, [genre])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (query.trim()) doSearch(query)
        else clearSearch()
    }

    function clearSearch() {
        setQuery('')
        setResults(null)
        setError(null)
        setFilterYear(year ? String(year) : '')
        setFilterMonth(month ? String(month) : '')
        setFilterDay('')
        setPage(1)
    }

    // Client-side date filter on results
    const filteredResults = results?.filter(w => {
        const dateStr = w.writtenAt || w.publishedAt
        if (!dateStr) return !filterYear && !filterMonth && !filterDay
        const d = new Date(dateStr)
        if (filterYear && d.getFullYear() !== parseInt(filterYear)) return false
        if (filterMonth && d.getMonth() + 1 !== parseInt(filterMonth)) return false
        if (filterDay && d.getDate() !== parseInt(filterDay)) return false
        return true
    }) ?? []

    const totalPages = Math.ceil(filteredResults.length / PAGE_SIZE)
    const pagedResults = filteredResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function goToPage(p: number) {
        setPage(p)
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const selectStyle = {
        padding: '8px 10px', borderRadius: 8, fontSize: 13,
        border: '1px solid var(--border)', background: 'var(--card-bg)',
        color: 'var(--text-secondary)', cursor: 'pointer',
    }

    return (
        <div>
            {/* Search bar */}
            <form onSubmit={handleSubmit} className="date-filter" style={{ flexWrap: 'wrap', gap: 8 }}>
                {genre && <input type="hidden" name="genre" value={genre} />}
                <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 220, display: 'flex' }}>
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Tìm theo nghĩa, cảm xúc, chủ đề..."
                        className="date-filter__select"
                        style={{ flex: 1, paddingRight: results ? 32 : undefined }}
                    />
                    {results && (
                        <button type="button" onClick={clearSearch}
                            style={{
                                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', fontSize: 16, lineHeight: 1,
                            }}>✕</button>
                    )}
                </div>
                <button type="submit" className="date-filter__btn" disabled={loading}>
                    {loading ? '...' : results ? 'Tìm lại' : 'Tìm'}
                </button>
            </form>

            {/* Error */}
            {error && (
                <div style={{
                    padding: '10px 14px', borderRadius: 8, marginTop: 8,
                    background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B',
                    fontSize: 13, fontFamily: "'Inter', sans-serif",
                }}>
                    {error}
                </div>
            )}

            {/* Semantic search results */}
            {results !== null ? (
                <div ref={resultRef}>
                    {/* Summary + filters */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 8,
                        padding: '12px 0 14px', borderBottom: '1px solid var(--border)',
                        marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)',
                        fontFamily: "'Inter', sans-serif",
                    }}>
                        <span>
                            Tìm thấy <strong style={{ color: 'var(--accent)' }}>{filteredResults.length}</strong>
                            {filterYear || filterMonth || filterDay
                                ? ` bài${filterDay ? ` ngày ${filterDay}` : ''}${filterMonth ? `/${filterMonth}` : ''}${filterYear ? `/${filterYear}` : ''}`
                                : ' tác phẩm liên quan'}
                            {totalPages > 1 && <> · Trang {page}/{totalPages}</>}
                        </span>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <select value={filterYear}
                                onChange={e => { setFilterYear(e.target.value); setFilterMonth(''); setFilterDay(''); setPage(1) }}
                                style={selectStyle}>
                                <option value=''>Tất cả năm</option>
                                {Array.from({ length: 18 }, (_, i) => 2026 - i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <select value={filterMonth}
                                onChange={e => { setFilterMonth(e.target.value); setFilterDay(''); setPage(1) }}
                                style={selectStyle}>
                                <option value=''>Tháng</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>Tháng {m}</option>
                                ))}
                            </select>
                            <select value={filterDay}
                                onChange={e => { setFilterDay(e.target.value); setPage(1) }}
                                style={selectStyle}>
                                <option value=''>Ngày</option>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                    <option key={d} value={d}>Ngày {d}</option>
                                ))}
                            </select>
                            {(filterYear || filterMonth || filterDay) && (
                                <button onClick={() => { setFilterYear(''); setFilterMonth(''); setFilterDay(''); setPage(1) }}
                                    style={{ ...selectStyle, padding: '6px 10px' }}>
                                    ✕ Xóa lọc
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Cards */}
                    {pagedResults.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {pagedResults.map((work, idx) => {
                                const sents = work.preview_sentences || []
                                const sentence = sents.length > 0
                                    ? sents[Math.floor(Math.random() * sents.length)]
                                    : ''
                                return (
                                    <Link key={work.id} href={`/tac-pham/${work.slug}`}
                                        className="poem-card ai-lib__work-card" style={{ textDecoration: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
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
                                                borderRadius: 6, fontSize: 15,
                                                fontFamily: "'Lora', serif",
                                                color: 'var(--text-secondary)',
                                                fontStyle: 'italic', lineHeight: 1.7,
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
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0', fontSize: 14 }}>
                            Không tìm thấy tác phẩm nào.
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            gap: 6, padding: '24px 0 8px',
                            fontFamily: "'Inter', sans-serif", fontSize: 13,
                        }}>
                            <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
                                style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card-bg)', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, color: 'var(--text-primary)' }}>
                                ← Trước
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                                .map((p, i, arr) => (
                                    <span key={p}>
                                        {i > 0 && arr[i - 1] !== p - 1 && <span style={{ color: 'var(--text-muted)', margin: '0 2px' }}>…</span>}
                                        <button onClick={() => goToPage(p)}
                                            style={{
                                                padding: '6px 10px', borderRadius: 6, minWidth: 34,
                                                border: p === page ? '1px solid var(--accent)' : '1px solid var(--border)',
                                                background: p === page ? 'var(--accent)' : 'var(--card-bg)',
                                                color: p === page ? '#fff' : 'var(--text-primary)',
                                                cursor: 'pointer', fontWeight: p === page ? 600 : 400,
                                            }}>
                                            {p}
                                        </button>
                                    </span>
                                ))}
                            <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
                                style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card-bg)', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, color: 'var(--text-primary)' }}>
                                Tiếp →
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                /* Regular server-rendered list */
                children
            )}
        </div>
    )
}
