'use client'

import dynamic from 'next/dynamic'

// ssr:false CHỈ được dùng trong Client Component
const AILibrarian = dynamic(() => import('@/components/public/AILibrarian'), { ssr: false })

export default function LazyAILibrarian() {
    return <AILibrarian />
}
