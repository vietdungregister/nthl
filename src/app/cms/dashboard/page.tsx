export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { formatDate, getGenreLabel } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    // Gộp 3 COUNT riêng lẻ thành 1 groupBy → giảm từ 3 xuống còn 2 round-trips DB
    const [statusCounts, totalViews, recentWorks] = await Promise.all([
        prisma.work.groupBy({
            by: ['status'],
            where: { deletedAt: null },
            _count: { id: true },
        }),
        prisma.work.aggregate({
            where: { deletedAt: null },
            _sum: { viewCount: true },
        }),
        prisma.work.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 5,
            // Không cần content — chỉ cần metadata cho dashboard list
            select: {
                id: true, title: true, status: true, genre: true, createdAt: true,
                tags: { include: { tag: { select: { name: true } } } },
            },
        }),
    ])

    const totalWorks = statusCounts.reduce((sum, s) => sum + s._count.id, 0)
    const published = statusCounts.find(s => s.status === 'published')?._count.id ?? 0
    const drafts = statusCounts.find(s => s.status === 'draft')?._count.id ?? 0

    const stats = [
        { label: 'Tổng tác phẩm', value: totalWorks, icon: '📝', color: '#3B82F6' },
        { label: 'Đã xuất bản', value: published, icon: '📖', color: '#10B981' },
        { label: 'Bản nháp', value: drafts, icon: '✏️', color: '#F59E0B' },
        { label: 'Lượt xem', value: totalViews._sum.viewCount || 0, icon: '👁️', color: '#8B5CF6' },
    ]

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>Dashboard</h1>
                <Link href="/cms/works/new" style={{
                    padding: '8px 18px', background: '#1F2937', color: 'white', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}>+ Tạo tác phẩm mới</Link>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                {stats.map(s => (
                    <div key={s.label} style={{
                        background: 'white', borderRadius: 12, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        border: '1px solid #F3F4F6',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, color: '#6B7280' }}>{s.label}</span>
                            <span style={{ fontSize: 20 }}>{s.icon}</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value.toLocaleString('vi-VN')}</div>
                    </div>
                ))}
            </div>

            {/* Recent works */}
            <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>Tác phẩm gần đây</h2>
                    <Link href="/cms/works" style={{ fontSize: 13, color: '#3B82F6', textDecoration: 'none' }}>Xem tất cả →</Link>
                </div>
                {recentWorks.map(work => (
                    <div key={work.id} style={{
                        padding: '14px 20px', borderBottom: '1px solid #F3F4F6',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div style={{ flex: 1 }}>
                            <Link href={`/cms/works/${work.id}`} style={{
                                fontSize: 14, fontWeight: 600, color: '#1F2937', textDecoration: 'none',
                            }}>{work.title}</Link>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{
                                    fontSize: 11, padding: '2px 8px', borderRadius: 100,
                                    background: work.status === 'published' ? '#D1FAE5' : '#FEF3C7',
                                    color: work.status === 'published' ? '#065F46' : '#92400E',
                                }}>{work.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span>
                                {work.tags.slice(0, 2).map(wt => (
                                    <span key={wt.tagId} style={{ fontSize: 11, color: '#9CA3AF' }}>{wt.tag.name}</span>
                                ))}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{getGenreLabel(work.genre)}</div>
                            <div style={{ fontSize: 11, color: '#D1D5DB' }}>{formatDate(work.createdAt)}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
