'use client'

import { useState } from 'react'

interface Props {
    content: string
    limit?: number
    className?: string
}

export default function ExpandableContent({ content, limit = 500, className }: Props) {
    const [expanded, setExpanded] = useState(false)

    const isLong = content.length > limit
    const displayContent = expanded ? content : content.slice(0, limit) + (isLong ? '...' : '')

    return (
        <div className={className}>
            {displayContent}
            {isLong && (
                <button
                    onClick={(e) => {
                        e.preventDefault()
                        setExpanded(!expanded)
                    }}
                    className="feed-card__readmore-btn"
                >
                    {expanded ? 'Thu gọn ↑' : 'Đọc tiếp ↓'}
                </button>
            )}
        </div>
    )
}
