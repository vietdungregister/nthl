'use client'

import dynamic from 'next/dynamic'

const DailyWorkBanner = dynamic(() => import('@/components/DailyWorkBanner'), { ssr: false })

interface DailyWork {
    id: string
    title: string | null
    slug: string
    genre: string
    content: string | null
    genreLabel: string
}

export default function LazyDailyWorkBanner({ work }: { work: DailyWork }) {
    return <DailyWorkBanner work={work} />
}
