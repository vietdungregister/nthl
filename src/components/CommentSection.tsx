'use client'

import { useState, useEffect } from 'react'

interface Comment {
    id: string
    name: string
    content: string
    createdAt: string
}

interface Props {
    workId: string
    expanded?: boolean
}

export default function CommentSection({ workId, expanded = false }: Props) {
    const [comments, setComments] = useState<Comment[]>([])
    const [showForm, setShowForm] = useState(expanded)
    const [name, setName] = useState('')
    const [content, setContent] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetch(`/api/comments?workId=${workId}`)
            .then(r => r.json())
            .then(data => setComments(Array.isArray(data) ? data : []))
    }, [workId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) return
        setSubmitting(true)
        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workId, name: name.trim() || 'Ẩn danh', content: content.trim() }),
            })
            if (res.ok) {
                const newComment = await res.json()
                setComments(prev => [newComment, ...prev])
                setContent('')
                setName('')
            }
        } finally {
            setSubmitting(false)
        }
    }

    const formatTime = (d: string) => {
        const date = new Date(d)
        return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="comment-section">
            {!expanded && (
                <button
                    className="comment-section__toggle"
                    onClick={() => setShowForm(!showForm)}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {comments.length > 0 ? `${comments.length} bình luận` : 'Bình luận'}
                </button>
            )}
            {expanded && (
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--text-primary)', marginBottom: 16 }}>
                    💬 Bình luận {comments.length > 0 ? `(${comments.length})` : ''}
                </h3>
            )}

            {showForm && (
                <div className="comment-section__body">
                    <form onSubmit={handleSubmit} className="comment-section__form">
                        <input
                            type="text"
                            placeholder="Tên của bạn (tùy chọn)"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="comment-section__input"
                        />
                        <textarea
                            placeholder="Viết bình luận..."
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            required
                            rows={3}
                            className="comment-section__textarea"
                        />
                        <button type="submit" disabled={submitting || !content.trim()} className="comment-section__submit">
                            {submitting ? 'Đang gửi...' : 'Gửi bình luận'}
                        </button>
                    </form>

                    {comments.length > 0 && (
                        <div className="comment-section__list">
                            {comments.map(c => (
                                <div key={c.id} className="comment-section__item">
                                    <div className="comment-section__item-header">
                                        <span className="comment-section__item-name">{c.name}</span>
                                        <span className="comment-section__item-date">{formatTime(c.createdAt)}</span>
                                    </div>
                                    <div className="comment-section__item-content">{c.content}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
