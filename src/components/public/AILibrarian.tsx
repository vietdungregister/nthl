'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

interface AIWork {
    id: string
    title: string
    slug: string
    genre: string
    excerpt: string
    tags: string[]
    publishedAt: string | null
}

interface AISearchResult {
    explanation: string
    works: AIWork[]
}

const GENRE_LABELS: Record<string, string> = {
    poem: 'Thơ',
    novel: 'Tiểu thuyết',
    essay: 'Tiểu luận',
    prose: 'Tùy bút',
    painting: 'Tranh',
    photo: 'Ảnh',
    video: 'Video',
}

const EXAMPLE_PROMPTS = [
    'Thơ về tình yêu nhẹ nhàng',
    'Thơ buồn về mùa đông',
    'Thơ dành cho trẻ em',
    'Thơ về sự cô đơn',
]

export default function AILibrarian() {
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<AISearchResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const resultRef = useRef<HTMLDivElement>(null)

    async function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault()
        if (!query.trim() || loading) return

        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const res = await fetch('/api/ai-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query.trim() }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error || 'Có lỗi xảy ra.')
                return
            }
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

    function handleExampleClick(prompt: string) {
        setQuery(prompt)
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
                        placeholder="Ví dụ: Tôi muốn đọc thơ buồn nhẹ nhàng về mùa đông..."
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

                {/* Example prompts */}
                {!result && !loading && (
                    <div className="ai-lib__examples" aria-label="Gợi ý tìm kiếm">
                        {EXAMPLE_PROMPTS.map(prompt => (
                            <button
                                key={prompt}
                                type="button"
                                className="ai-lib__example-chip"
                                onClick={() => handleExampleClick(prompt)}
                                disabled={loading}
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                )}

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

            {/* Result */}
            {result && (
                <div className="ai-lib__result" ref={resultRef} aria-live="polite">
                    {/* AI explanation */}
                    {result.explanation && (
                        <div className="ai-lib__explanation">
                            <div className="ai-lib__explanation-icon" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                </svg>
                            </div>
                            <p className="ai-lib__explanation-text">{result.explanation}</p>
                        </div>
                    )}

                    {/* Work cards */}
                    {result.works.length > 0 ? (
                        <div className="ai-lib__works">
                            {result.works.map(work => (
                                <Link
                                    key={work.id}
                                    href={`/tac-pham/${work.slug}`}
                                    className="poem-card ai-lib__work-card"
                                >
                                    <div className="poem-card__genre">
                                        {GENRE_LABELS[work.genre] ?? work.genre}
                                    </div>
                                    <div className="poem-card__title">{work.title}</div>
                                    {work.excerpt && (
                                        <div className="poem-card__excerpt">{work.excerpt}</div>
                                    )}
                                    {work.tags.length > 0 && (
                                        <div className="poem-card__tags">
                                            {work.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="poem-card__tag">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="ai-lib__empty">
                            Thủ thư chưa tìm được tác phẩm nào phù hợp. Thử diễn đạt khác nhé.
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
