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
                    ? <mark key={i} className="sc__highlight">{part}</mark>
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
            const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
            const data = await res.json()
            const keywordResults = data.works || []

            if (keywordResults.length > 0) {
                setResults(keywordResults)
                setSearchMode('keyword')
            } else {
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
        <div className="sc__wrap">
            {/* Search form */}
            <form onSubmit={handleSubmit} className="sc__form">
                <input
                    ref={inputRef}
                    id="search-input"
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Tìm bài thơ, câu thơ, từ khóa..."
                    autoComplete="off"
                    className="search-box sc__input"
                />
                <button
                    id="search-submit"
                    type="submit"
                    disabled={loading}
                    className="btn btn--primary"
                >
                    {loading ? '...' : 'Tìm'}
                </button>
                <button
                    id="random-poem-btn"
                    type="button"
                    onClick={handleRandom}
                    disabled={randomLoading}
                    title="Thơ ngẫu nhiên"
                    className="btn btn--ghost sc__dice-btn"
                >
                    🎲
                </button>
            </form>

            {/* Random poem card */}
            {randomWork && (
                <div className="sc__random-card">
                    <div className="meta sc__random-label">🎲 Thơ ngẫu nhiên</div>
                    <Link href={`/tac-pham/${randomWork.slug}`} className="sc__random-link">
                        <div className="sc__random-title">{randomWork.title}</div>
                        {randomWork.excerpt && (
                            <div className="sc__random-excerpt">
                                {randomWork.excerpt.slice(0, 120)}{randomWork.excerpt.length > 120 ? '...' : ''}
                            </div>
                        )}
                    </Link>
                    <button onClick={handleRandom} className="sc__random-more">→ Bài khác</button>
                </div>
            )}

            {/* Semantic fallback label */}
            {searched && !loading && results.length > 0 && searchMode === 'semantic' && (
                <div className="sc__mode-label">Kết quả tương tự theo ngữ nghĩa 🔮</div>
            )}

            {/* Results list */}
            <div className="sc__results">
                {results.map(work => (
                    <Link
                        key={work.id}
                        href={`/tac-pham/${work.slug}`}
                        id={`result-${work.id}`}
                        className="sc__result-card card card--interactive"
                    >
                        <div className="sc__result-title">{work.title}</div>

                        {work.matchedLines.length > 0 && (
                            <div className="sc__result-lines">
                                {work.matchedLines.slice(0, 2).map((line, i) => (
                                    <div key={i} className="sc__result-line">
                                        &ldquo;<Highlight text={line} query={query} />&rdquo;
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="sc__result-meta">
                            <span className="sc__genre-badge">
                                {GENRE_LABELS[work.genre] || work.genre}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Empty state */}
            {searched && !loading && results.length === 0 && (
                <div className="sc__empty">
                    <div className="sc__empty-icon">🔍</div>
                    <div className="sc__empty-msg">Không tìm thấy kết quả cho &ldquo;{query}&rdquo;</div>
                    <div className="sc__empty-hint">Thử từ khóa khác hoặc bấm 🎲 để khám phá ngẫu nhiên</div>
                </div>
            )}

            {/* Initial state */}
            {!searched && !randomWork && (
                <div className="sc__initial">
                    <div className="sc__initial-hint">Nhập từ khóa để tìm kiếm, hoặc</div>
                    <button onClick={handleRandom} className="btn btn--ghost">
                        🎲 Khám phá thơ ngẫu nhiên
                    </button>
                </div>
            )}
        </div>
    )
}
