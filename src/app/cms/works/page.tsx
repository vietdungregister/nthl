'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface Genre { id: string; value: string; label: string; emoji: string }

interface Work {
    id: string; title: string; slug: string; genre: string; status: string;
    isFeatured: boolean; viewCount: number; createdAt: string; publishedAt: string | null;
}

export default function WorksListPage() {
    const [works, setWorks] = useState<Work[]>([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [genreFilter, setGenreFilter] = useState('')
    const [loading, setLoading] = useState(true)
    const [genres, setGenres] = useState<Genre[]>([])

    const HARDCODED_GENRES = [
        { id: '_photo', value: 'photo', label: 'Ảnh', emoji: '📷' },
        { id: '_video', value: 'video', label: 'Video', emoji: '🎬' },
    ]
    useEffect(() => {
        fetch('/api/genres').then(r => r.json()).then(d => {
            const db = d || []
            const existing = new Set(db.map((g: Genre) => g.value))
            setGenres([...db, ...HARDCODED_GENRES.filter(g => !existing.has(g.value))])
        })
    }, [])

    const fetchWorks = async () => {
        setLoading(true)
        const params = new URLSearchParams({ limit: '50' })
        if (search) params.set('search', search)
        if (statusFilter) params.set('status', statusFilter)
        if (genreFilter) params.set('genre', genreFilter)
        const res = await fetch(`/api/works?${params}`)
        const data = await res.json()
        setWorks(data.works || [])
        setLoading(false)
    }

    useEffect(() => { fetchWorks() }, [search, statusFilter, genreFilter])

    const deleteWork = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa tác phẩm này?')) return
        await fetch(`/api/works/${id}`, { method: 'DELETE' })
        fetchWorks()
    }

    const inputStyle: React.CSSProperties = {
        padding: '8px 14px', border: '1px solid #D1D5DB', borderRadius: 8,
        fontSize: 13, outline: 'none', fontFamily: 'inherit',
    }

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>Tác phẩm</h1>
                <Link href="/cms/works/new" style={{
                    padding: '8px 18px', background: '#1F2937', color: 'white', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}>+ Tạo mới</Link>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
                    <option value="">Tất cả trạng thái</option>
                    <option value="published">Đã xuất bản</option>
                    <option value="draft">Bản nháp</option>
                </select>
                <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)} style={inputStyle}>
                    <option value="">Tất cả thể loại</option>
                    {genres.map(g => <option key={g.value} value={g.value}>{g.emoji} {g.label}</option>)}
                </select>
            </div>

            {/* Table */}
            <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Tiêu đề</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Thể loại</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Trạng thái</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Lượt xem</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Ngày tạo</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Đang tải...</td></tr>
                        ) : works.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Không tìm thấy tác phẩm nào.</td></tr>
                        ) : works.map(work => (
                            <tr key={work.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '12px 16px' }}>
                                    <Link href={`/cms/works/${work.id}`} style={{ fontWeight: 600, color: '#1F2937', textDecoration: 'none' }}>
                                        {work.title}
                                    </Link>
                                    {work.isFeatured && <span style={{ marginLeft: 6, color: '#F59E0B', fontSize: 12 }}>⭐</span>}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{genres.find(g => g.value === work.genre)?.label ?? work.genre}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        fontSize: 11, padding: '2px 8px', borderRadius: 100,
                                        background: work.status === 'published' ? '#D1FAE5' : '#FEF3C7',
                                        color: work.status === 'published' ? '#065F46' : '#92400E',
                                    }}>{work.status === 'published' ? 'Đã xuất bản' : 'Nháp'}</span>
                                </td>
                                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{work.viewCount}</td>
                                <td style={{ padding: '12px 16px', color: '#9CA3AF' }}>{formatDate(work.createdAt)}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <button onClick={() => deleteWork(work.id)} style={{
                                        background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 12,
                                    }}>Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
