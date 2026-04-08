'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

interface DbGenre {
    value: string
    label: string
}

const PAGE_SIZE = 20
const TTL_MS = 15 * 60 * 1000  // 15 phút

// Visual genres: search + filter qua URL (giữ photo grid layout)
const VISUAL_GENRES = new Set(['photo', 'video', 'painting'])

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
    sort?: string
    dbGenres?: DbGenre[]
}

export default function WorksSmartSearch({ children, defaultSearch, genre, month, year, sort, dbGenres }: Props) {
    const router = useRouter()
    const isVisual = genre ? VISUAL_GENRES.has(genre) : false

    const storageKey = `works-smart-search:${genre || 'all'}`
    const [query, setQuery] = useState(defaultSearch || '')
    const [loading, setLoading] = useState(false)

    // AI search state (text genres only)
    const [results, setResults] = useState<SearchWork[] | null>(null)

    // Stable random sentence per work — chỉ chọn lại khi results thay đổi
    const stablePreview = useMemo(() => {
        if (!results) return new Map<string, string>()
        const map = new Map<string, string>()
        results.forEach(w => {
            const sents = w.preview_sentences || []
            map.set(w.id, sents.length > 0 ? sents[Math.floor(Math.random() * sents.length)] : '')
        })
        return map
    }, [results])
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)

    // Filter state
    const [filterYear, setFilterYear] = useState<string>(year ? String(year) : '')
    const [filterMonth, setFilterMonth] = useState<string>(month ? String(month) : '')
    const [filterDay, setFilterDay] = useState<string>('')
    const [filterGenre, setFilterGenre] = useState<string>(genre || '')
    const [filterSort, setFilterSort] = useState<string>(sort || 'newest')

    const resultRef = useRef<HTMLDivElement>(null)
    const initialized = useRef(false)

    // Sync state whe URL changes (genre/sort from server)
    useEffect(() => {
        setFilterGenre(genre || '')
        setFilterSort(sort || 'newest')
        setFilterYear(year ? String(year) : '')
        setFilterMonth(month ? String(month) : '')
    }, [genre, sort, year, month])

    // ── Restore sessionStorage (chỉ cho text genres / AI search) ──
    useEffect(() => {
        if (isVisual) return
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
                    doSearch(s.query)
                }
            }
        } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Lưu sessionStorage cho AI search results
    useEffect(() => {
        if (isVisual) return
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
    }, [results, query, page, filterYear, filterMonth, filterDay, storageKey, isVisual])

    // ── AI Search (text genres only) ──────────────────────────────
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

    // ── URL Navigation ──────────────────────────────────────────
    const navigateWithFilters = useCallback((opts: {
        q?: string, y?: string, m?: string, g?: string, s?: string
    }) => {
        const params = new URLSearchParams()
        const g = opts.g !== undefined ? opts.g : filterGenre
        const s = opts.s !== undefined ? opts.s : filterSort
        const y = opts.y !== undefined ? opts.y : filterYear
        const m = opts.m !== undefined ? opts.m : filterMonth
        const q = opts.q !== undefined ? opts.q : query
        if (g) params.set('genre', g)
        if (q.trim()) params.set('search', q.trim())
        if (y) params.set('year', y)
        if (m) params.set('month', m)
        if (s && s !== 'newest') params.set('sort', s)
        setLoading(true)
        router.push(`/tac-pham?${params}`)
    }, [filterGenre, filterSort, filterYear, filterMonth, query, router])

    // ── Submit handlers ─────────────────────────────────────────
    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (isVisual) {
            navigateWithFilters({ q: query, y: filterYear, m: filterMonth })
        } else {
            if (query.trim()) doSearch(query)
            else clearSearch()
        }
    }

    function clearSearch() {
        setQuery('')
        setResults(null)
        setError(null)
        setFilterYear(year ? String(year) : '')
        setFilterMonth(month ? String(month) : '')
        setFilterDay('')
        setPage(1)
        if (isVisual) {
            const params = new URLSearchParams()
            if (genre) params.set('genre', genre)
            router.push(`/tac-pham?${params}`)
        }
    }

    // ── Filter change handlers ────────────────────────────────────
    function handleGenreChange(val: string) {
        setFilterGenre(val)
        navigateWithFilters({ g: val })
    }

    function handleSortChange(val: string) {
        setFilterSort(val)
        navigateWithFilters({ s: val })
    }

    function handleYearChange(val: string) {
        setFilterYear(val)
        setFilterMonth('')
        navigateWithFilters({ y: val, m: '' })
    }

    function handleMonthChange(val: string) {
        setFilterMonth(val)
        navigateWithFilters({ m: val })
    }

    // ── Client-side date filter (AI search results only) ─────────
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

    const selectStyle: React.CSSProperties = {
        padding: '7px 10px', borderRadius: 8, fontSize: 13,
        border: '1px solid var(--border)', background: 'var(--card-bg)',
        color: 'var(--text-secondary)', cursor: 'pointer',
        outline: 'none', transition: 'border-color 0.15s',
    }

    const hasActiveFilter = filterYear || filterMonth || (defaultSearch && defaultSearch.trim())

    // Build genre options from dbGenres prop (server-side data)
    const genreOptions: DbGenre[] = dbGenres && dbGenres.length > 0
        ? dbGenres
        : [
            { value: 'poem', label: 'Thơ' },
            { value: 'stt', label: 'Stt' },
            { value: 'essay', label: 'Tản văn' },
            { value: 'short_story', label: 'Truyện ngắn' },
            { value: 'memoir', label: 'Bút ký' },
            { value: 'photo', label: 'Ảnh' },
            { value: 'video', label: 'Video' },
        ]

    return (
        <div>
            {/* ── Search bar ─────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="date-filter" style={{ flexWrap: 'wrap', gap: 8 }}>
                {genre && <input type="hidden" name="genre" value={genre} />}
                <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 220, display: 'flex' }}>
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder=""
                        className="date-filter__select"
                        style={{ flex: 1, paddingRight: results ? 32 : undefined }}
                    />
                    {(results || (isVisual && defaultSearch)) && (
                        <button type="button" onClick={clearSearch}
                            style={{
                                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', fontSize: 16, lineHeight: 1,
                            }}>✕</button>
                    )}
                </div>
                <button type="submit" className="date-filter__btn" disabled={loading}>
                    {loading ? '...' : (results || (isVisual && defaultSearch)) ? 'Tìm lại' : 'Tìm'}
                </button>
            </form>

            {/* ── Filter/Sort bar — LUÔN HIỂN THỊ ─────────────────────── */}
            <div className="works-filter-bar">
                {/* Genre selector */}
                <select
                    value={filterGenre}
                    onChange={e => handleGenreChange(e.target.value)}
                    style={selectStyle}
                    aria-label="Lọc thể loại"
                >
                    <option value="">Tất cả thể loại</option>
                    {genreOptions.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                </select>

                {/* Sort selector */}
                <select
                    value={filterSort}
                    onChange={e => handleSortChange(e.target.value)}
                    style={selectStyle}
                    aria-label="Sắp xếp"
                >
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                    <option value="views">Xem nhiều nhất</option>
                </select>

                {/* Year */}
                <select value={filterYear}
                    onChange={e => handleYearChange(e.target.value)}
                    style={selectStyle}
                    aria-label="Lọc năm"
                >
                    <option value=''>Tất cả năm</option>
                    {Array.from({ length: 18 }, (_, i) => 2026 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                {/* Month */}
                <select value={filterMonth}
                    onChange={e => handleMonthChange(e.target.value)}
                    style={selectStyle}
                    aria-label="Lọc tháng"
                >
                    <option value=''>Tháng</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>Tháng {m}</option>
                    ))}
                </select>

                {/* Day filter — chỉ cho AI search */}
                {results !== null && (
                    <select value={filterDay}
                        onChange={e => { setFilterDay(e.target.value); setPage(1) }}
                        style={selectStyle}
                        aria-label="Lọc ngày"
                    >
                        <option value=''>Ngày</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>Ngày {d}</option>
                        ))}
                    </select>
                )}

                {/* Xóa lọc */}
                {(hasActiveFilter || filterGenre || filterSort !== 'newest') && (
                    <button
                        onClick={() => {
                            setFilterGenre('')
                            setFilterSort('newest')
                            setFilterYear('')
                            setFilterMonth('')
                            setFilterDay('')
                            setResults(null)
                            setQuery('')
                            router.push('/tac-pham')
                        }}
                        style={{ ...selectStyle, color: 'var(--accent)', borderColor: 'var(--accent)', fontWeight: 500 }}
                    >
                        ✕ Xóa lọc
                    </button>
                )}

                {/* AI search result count */}
                {results !== null && (
                    <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" }}>
                        Tìm thấy <strong style={{ color: 'var(--accent)' }}>{filteredResults.length}</strong> tác phẩm
                        {totalPages > 1 && <> · Trang {page}/{totalPages}</>}
                    </span>
                )}
            </div>

            {/* ── Skeleton Loading ─────────────────────────────────────── */}
            {loading && !results && <SearchSkeleton />}

            {/* ── Error ───────────────────────────────────────────────── */}
            {error && (
                <div style={{
                    padding: '10px 14px', borderRadius: 8, marginTop: 8,
                    background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B',
                    fontSize: 13, fontFamily: "'Inter', sans-serif",
                }}>
                    {error}
                </div>
            )}

            {/* ── AI Search results (text genres only) ────────────────── */}
            {results !== null ? (
                <div ref={resultRef}>
                    {/* Cards */}
                    {pagedResults.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {pagedResults.map((work, idx) => {
                                const sentence = stablePreview.get(work.id) || ''
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

                    {/* Pagination (AI results) */}
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
                /* Regular server-rendered content (photo grid or feed) */
                children
            )}
        </div>
    )
}
