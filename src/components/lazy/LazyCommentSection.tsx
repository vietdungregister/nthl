'use client'

import dynamic from 'next/dynamic'

const CommentSection = dynamic(() => import('@/components/CommentSection'), { ssr: false })

export default function LazyCommentSection({ workId, expanded }: { workId: string; expanded?: boolean }) {
    return <CommentSection workId={workId} expanded={expanded} />
}
