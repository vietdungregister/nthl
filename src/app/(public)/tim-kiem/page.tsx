import { Suspense } from 'react'
import type { Metadata } from 'next'
import SearchClient from './SearchClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Tìm kiếm | NTHL',
    description: 'Tìm kiếm bài thơ, câu thơ của Nguyễn Thế Hoàng Linh',
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div style={{ color: 'var(--text-muted)', padding: 20 }}>Đang tải...</div>}>
            <SearchClient />
        </Suspense>
    )
}
