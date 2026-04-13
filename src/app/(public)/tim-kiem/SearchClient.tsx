'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface WorkResult {
    id: string
    title: string
    slug: string
    genre: string
    excerpt: string | null
    tier: number
    rank: number
    matchedLines: string[]
}

type SearchMode = 'keyword' | 'semantic'

const GENRE_LABELS: Record<string, string> = {
    poem: 'Thơ',
    stt: 'Status',
    photo: 'Ảnh',
    video: 'Video',
    prose: 'Văn xuôi',
}

const TIER_LABELS: Record<number, string> = {
    3: 'Liên quan',
    4: 'Gần đúng',
}

/** Highlight từ khóa trong text */
function Highlight({ text, query }: { text: string; query: string }) {
    if (!query || !text) return <>{text}</>
    const words = query.split(/\s+/).filter(w => w.length > 1)
    if (!words.length) return <>{text}</>

    const pattern = new RegExp(
        `(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
        'gi'
    )
    const parts = text.split(pattern)
    return (
        <>
            {parts.map((part, i) =>
                pattern.test(part)
                    ? <mark key={i} style={{ background: 'rgba(124,106,247,0.3)', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>{part}</mark>
                    : part
            )}
        </>
    )
}

export default function SearchClient() {
    const router = useRouter()
    const sp = useSearchParams()
    const initialQuery = sp.get('q') || ''

    const [query, setQuery] = useState(initialQuery)
    const [results, setResults] = useState<WorkResult[]>([])
    const [loading, setLoading] = useState(false)
    const [searchMode, setSearchMode] = useState<SearchMode>('keyword')
    const [randomWork, setRandomWork] = useState<WorkResult | null>(null)
    const [randomLoading, setRandomLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const doSearch = useCallback(async (q: string) => {
        const trimmed = q.trim()
        if (!trimmed) return
        setLoading(true)
        setSearched(true)
        setSearchMode('keyword')
        try {
            // Step 1: Keyword search
            const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
            const data = await res.json()
            const keywordResults = data.works || []

            if (keywordResults.length > 0) {
                setResults(keywordResults)
                setSearchMode('keyword')
            } else {
                // Step 2: AI semantic fallback khi keyword search không ra kết quả
                setSearchMode('semantic')
                try {
                    const aiRes = await fetch('/api/ai-search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: trimmed }),
                    })
                    const aiData = await aiRes.json()
                    setResults(aiData.works || [])
                } catch {
                    setResults([])
                }
            }
        } catch {
            setResults([])
        } finally {
            setLoading(false)
        }
    }, [])

    // Search on initial query from URL
    useEffect(() => {
        if (initialQuery) doSearch(initialQuery)
        inputRef.current?.focus()
    }, []) // eslint-disable-line

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return
        router.replace(`/tim-kiem?q=${encodeURIComponent(query.trim())}`, { scroll: false })
        doSearch(query)
    }

    const handleRandom = async () => {
        setRandomLoading(true)
        try {
            const res = await fetch('/api/search/random')
            const data = await res.json()
            setRandomWork(data)
        } catch {
            setRandomWork(null)
        } finally {
            setRandomLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 4px' }}>
            {/* Search form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                <input
                    ref={inputRef}
                    id="search-input"
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Tìm bài thơ, câu thơ, từ khóa..."
                    autoComplete="off"
                    style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border, #333)',
                        background: 'var(--surface, #111)',
                        color: 'var(--text-primary, #eee)',
                        fontSize: 15,
                        outline: 'none',
                    }}
                />
                <button
                    id="search-submit"
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '10px 18px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'var(--accent, #7c6af7)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: loading ? 'wait' : 'pointer',
                        fontSize: 14,
                        minWidth: 64,
                    }}
                >
                    {loading ? '...' : 'Tìm'}
                </button>
                <button
                    id="random-poem-btn"
                    type="button"
                    onClick={handleRandom}
                    disabled={randomLoading}
                    title="Thơ ngẫu nhiên"
                    style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border, #333)',
                        background: 'transparent',
                        color: 'var(--text-muted, #888)',
                        cursor: randomLoading ? 'wait' : 'pointer',
                        fontSize: 18,
                        lineHeight: 1,
                    }}
                >
                    🎲
                </button>
            </form>

            {/* Random poem card */}
            {randomWork && (
                <div style={{
                    marginBottom: 24,
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: '1px dashed var(--accent, #7c6af7)',
                    background: 'var(--surface, #111)',
                }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                        🎲 Thơ ngẫu nhiên
                    </div>
                    <Link href={`/tac-pham/${randomWork.slug}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{randomWork.title}</div>
                        {randomWork.excerpt && (
                            <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', lineHeight: 1.6 }}>
                                {randomWork.excerpt.slice(0, 120)}{randomWork.excerpt.length > 120 ? '...' : ''}
                            </div>
                        )}
                    </Link>
                    <button
                        onClick={handleRandom}
                        style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--accent, #7c6af7)', cursor: 'pointer', fontSize: 12, padding: 0 }}
                    >
                        → Bài khác
                    </button>
                </div>
            )}

            {/* Results count */}
            {searched && !loading && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
                    {results.length > 0 && searchMode === 'keyword' && (
                        <>Tìm thấy <strong style={{ color: 'var(--text-primary)' }}>{results.length}</strong> kết quả cho &ldquo;{query}&rdquo;</>
                    )}
                    {results.length > 0 && searchMode === 'semantic' && (
                        <span>
                            Không có kết quả chính xác — hiển thị
                            {' '}<strong style={{ color: 'var(--text-primary)' }}>{results.length}</strong>
                            {' '}kết quả tương tự theo ngữ nghĩa 🔮
                        </span>
                    )}
                    {results.length === 0 && (
                        <>Không tìm thấy kết quả nào cho &ldquo;{query}&rdquo;</>
                    )}
                </div>
            )}

            {/* Results list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.map(work => (
                    <Link
                        key={work.id}
                        href={`/tac-pham/${work.slug}`}
                        id={`result-${work.id}`}
                        style={{
                            display: 'block',
                            padding: '12px 14px',
                            borderRadius: 10,
                            border: '1px solid var(--border, #222)',
                            background: 'var(--surface, #111)',
                            textDecoration: 'none',
                            transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent, #7c6af7)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border, #222)')}
                    >
                        {/* Title with highlight */}
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: work.matchedLines.length > 0 ? 8 : 6, lineHeight: 1.4 }}>
                            <Highlight text={work.title} query={query} />
                        </div>

                        {/* Matched lines */}
                        {work.matchedLines.length > 0 && (
                            <div style={{
                                borderLeft: '2px solid var(--accent, #7c6af7)',
                                paddingLeft: 10,
                                marginBottom: 8,
                            }}>
                                {work.matchedLines.slice(0, 2).map((line, i) => (
                                    <div key={i} style={{ color: 'var(--text-secondary, #bbb)', fontSize: 13, fontStyle: 'italic', lineHeight: 1.6 }}>
                                        &ldquo;<Highlight text={line} query={query} />&rdquo;
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Meta row */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{
                                fontSize: 11,
                                padding: '2px 7px',
                                borderRadius: 4,
                                background: 'rgba(255,255,255,0.06)',
                                color: 'var(--text-muted)',
                            }}>
                                {GENRE_LABELS[work.genre] || work.genre}
                            </span>
                            {work.tier >= 3 && TIER_LABELS[work.tier] && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted, #555)' }}>
                                    {TIER_LABELS[work.tier]}
                                </span>
                            )}
                        </div>
                    </Link>
                ))}
            </div>

            {/* Empty state */}
            {searched && !loading && results.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                    <div style={{ marginBottom: 6 }}>Không tìm thấy kết quả cho &ldquo;{query}&rdquo;</div>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>Thử từ khóa khác hoặc bấm 🎲 để khám phá ngẫu nhiên</div>
                </div>
            )}

            {/* Initial state — no search yet */}
            {!searched && !randomWork && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>Nhập từ khóa để tìm kiếm, hoặc</div>
                    <button
                        onClick={handleRandom}
                        style={{
                            padding: '8px 20px',
                            borderRadius: 8,
                            border: '1px solid var(--border, #333)',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: 14,
                        }}
                    >
                        🎲 Khám phá thơ ngẫu nhiên
                    </button>
                </div>
            )}
        </div>
    )
}
