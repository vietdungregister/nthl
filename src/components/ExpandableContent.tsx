'use client'

import { useState } from 'react'
import { cleanContent } from '@/lib/utils'

interface Props {
    content: string
    limit?: number
    className?: string
}

export default function ExpandableContent({ content, limit = 500, className }: Props) {
    const [expanded, setExpanded] = useState(false)

    // Clean crawled content before display
    const cleaned = cleanContent(content)
    const isLong = cleaned.length > limit
    const displayContent = expanded ? cleaned : cleaned.slice(0, limit) + (isLong ? '...' : '')

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
