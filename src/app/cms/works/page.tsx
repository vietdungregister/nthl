export const dynamic = 'force-dynamic'
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface Genre { id: string; value: string; label: string; emoji: string }
interface Tag { id: string; name: string; slug: string }

interface Work {
    id: string
    title: string
    slug: string
    genre: string
    status: string
    isFeatured: boolean
    viewCount: number
    createdAt: string
    publishedAt: string | null
    writtenAt: string | null
}

interface Pagination {
    page: number
    limit: number
    total: number
    totalPages: number
}

const LIMIT = 50

const SORT_OPTIONS = [
    { value: 'newest',        label: 'Ngày tạo: Mới nhất' },
    { value: 'oldest',        label: 'Ngày tạo: Cũ nhất' },
    { value: 'title',         label: 'Tiêu đề: A → Z' },
    { value: 'title_desc',    label: 'Tiêu đề: Z → A' },
    { value: 'writtenAt_desc', label: 'Sáng tác: Mới nhất' },
    { value: 'writtenAt_asc',  label: 'Sáng tác: Cũ nhất' },
    { value: 'views',         label: 'Lượt xem: Cao nhất' },
]

const inputStyle: React.CSSProperties = {
    padding: '8px 14px',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
    background: 'white',
}

export default function WorksListPage() {
    const [works, setWorks] = useState<Work[]>([])
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: LIMIT, total: 0, totalPages: 0 })
    const [loading, setLoading] = useState(true)

    // Filters
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [genreFilter, setGenreFilter] = useState('')
    const [tagFilter, setTagFilter] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [writtenFrom, setWrittenFrom] = useState('')
    const [writtenTo, setWrittenTo] = useState('')
    const [sort, setSort] = useState('newest')
    const [page, setPage] = useState(1)

    // Reference data
    const [genres, setGenres] = useState<Genre[]>([])
    const [tags, setTags] = useState<Tag[]>([])

    const HARDCODED_GENRES = [
        { id: '_photo', value: 'photo', label: 'Ảnh', emoji: '📷' },
        { id: '_video', value: 'video', label: 'Video', emoji: '🎬' },
    ]

    // Load genres and tags once
    useEffect(() => {
        fetch('/api/genres').then(r => r.json()).then(d => {
            const db = d || []
            const existing = new Set(db.map((g: Genre) => g.value))
            setGenres([...db, ...HARDCODED_GENRES.filter(g => !existing.has(g.value))])
        })
        fetch('/api/tags').then(r => r.json()).then(d => {
            setTags(Array.isArray(d) ? d : [])
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchWorks = useCallback(async (currentPage: number) => {
        setLoading(true)
        const params = new URLSearchParams({ limit: String(LIMIT), page: String(currentPage), sort })
        if (search)       params.set('search', search)
        if (statusFilter) params.set('status', statusFilter)
        if (genreFilter)  params.set('genre', genreFilter)
        if (tagFilter)    params.set('tag', tagFilter)
        if (dateFrom)     params.set('dateFrom', dateFrom)
        if (dateTo)       params.set('dateTo', dateTo)
        if (writtenFrom)  params.set('writtenFrom', writtenFrom)
        if (writtenTo)    params.set('writtenTo', writtenTo)

        const res = await fetch(`/api/works?${params}`)
        const data = await res.json()
        setWorks(data.works || [])
        setPagination(data.pagination || { page: 1, limit: LIMIT, total: 0, totalPages: 0 })
        setLoading(false)
    }, [search, statusFilter, genreFilter, tagFilter, dateFrom, dateTo, writtenFrom, writtenTo, sort])

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1)
    }, [search, statusFilter, genreFilter, tagFilter, dateFrom, dateTo, writtenFrom, writtenTo, sort])

    // Fetch when page or filters change
    useEffect(() => {
        fetchWorks(page)
    }, [fetchWorks, page])

    const deleteWork = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa tác phẩm này?')) return
        await fetch(`/api/works/${id}`, { method: 'DELETE' })
        fetchWorks(page)
    }

    const resetFilters = () => {
        setSearch('')
        setStatusFilter('')
        setGenreFilter('')
        setTagFilter('')
        setDateFrom('')
        setDateTo('')
        setWrittenFrom('')
        setWrittenTo('')
        setSort('newest')
    }

    const hasActiveFilters = search || statusFilter || genreFilter || tagFilter || dateFrom || dateTo || writtenFrom || writtenTo || sort !== 'newest'

    // Pagination helpers
    const goTo = (p: number) => {
        if (p < 1 || p > pagination.totalPages) return
        setPage(p)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const getPageNumbers = () => {
        const { totalPages } = pagination
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)

        const around = 2
        const pages: (number | '...')[] = []
        pages.push(1)

        if (page > around + 2) pages.push('...')
        for (let i = Math.max(2, page - around); i <= Math.min(totalPages - 1, page + around); i++) {
            pages.push(i)
        }
        if (page < totalPages - around - 1) pages.push('...')

        pages.push(totalPages)
        return pages
    }

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', margin: 0 }}>Tác phẩm</h1>
                    {!loading && (
                        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
                            {pagination.total.toLocaleString('vi-VN')} tác phẩm
                            {hasActiveFilters && ' (đã lọc)'}
                        </p>
                    )}
                </div>
                <Link href="/cms/works/new" style={{
                    padding: '8px 18px', background: '#1F2937', color: 'white', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}>+ Tạo mới</Link>
            </div>

            {/* Filters Row 1: Search + Status + Genre */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="🔍 Tìm kiếm tiêu đề..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
                    <option value="">Tất cả trạng thái</option>
                    <option value="published">Đã xuất bản</option>
                    <option value="draft">Bản nháp</option>
                    <option value="scheduled">Hẹn giờ</option>
                </select>
                <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)} style={inputStyle}>
                    <option value="">Tất cả thể loại</option>
                    {genres.map(g => <option key={g.value} value={g.value}>{g.emoji} {g.label}</option>)}
                </select>
            </div>

            {/* Filters Row 2: Tag + Date range + Sort */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={{ ...inputStyle, minWidth: 160 }}>
                    <option value="">🏷️ Tất cả tag</option>
                    {tags.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                </select>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>Ngày tạo</span>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                    <span style={{ fontSize: 12, color: '#6B7280' }}>→</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>Sáng tác</span>
                    <input type="date" value={writtenFrom} onChange={e => setWrittenFrom(e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                    <span style={{ fontSize: 12, color: '#6B7280' }}>→</span>
                    <input type="date" value={writtenTo} onChange={e => setWrittenTo(e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>

                <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...inputStyle, minWidth: 200 }}>
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                {hasActiveFilters && (
                    <button
                        onClick={resetFilters}
                        style={{
                            padding: '8px 14px', background: 'none', border: '1px solid #E5E7EB',
                            borderRadius: 8, fontSize: 12, cursor: 'pointer', color: '#6B7280',
                            whiteSpace: 'nowrap',
                        }}
                    >✕ Xóa bộ lọc</button>
                )}
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
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Ngày sáng tác</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Ngày tạo</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}>Đang tải...</td></tr>
                        ) : works.length === 0 ? (
                            <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}>Không tìm thấy tác phẩm nào.</td></tr>
                        ) : works.map(work => (
                            <tr key={work.id} style={{ borderBottom: '1px solid #F3F4F6' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <td style={{ padding: '11px 16px', maxWidth: 320 }}>
                                    <Link href={`/cms/works/${work.id}`} style={{ fontWeight: 600, color: '#1F2937', textDecoration: 'none' }}>
                                        {work.title}
                                    </Link>
                                    {work.isFeatured && <span style={{ marginLeft: 6, color: '#F59E0B', fontSize: 12 }}>⭐</span>}
                                </td>
                                <td style={{ padding: '11px 16px', color: '#6B7280' }}>
                                    {genres.find(g => g.value === work.genre)?.label ?? work.genre}
                                </td>
                                <td style={{ padding: '11px 16px' }}>
                                    <span style={{
                                        fontSize: 11, padding: '2px 8px', borderRadius: 100,
                                        background: work.status === 'published' ? '#D1FAE5' : work.status === 'scheduled' ? '#DBEAFE' : '#FEF3C7',
                                        color: work.status === 'published' ? '#065F46' : work.status === 'scheduled' ? '#1E40AF' : '#92400E',
                                    }}>
                                        {work.status === 'published' ? 'Đã xuất bản' : work.status === 'scheduled' ? 'Hẹn giờ' : 'Nháp'}
                                    </span>
                                </td>
                                <td style={{ padding: '11px 16px', color: '#6B7280' }}>{work.viewCount.toLocaleString('vi-VN')}</td>
                                <td style={{ padding: '11px 16px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                                    {work.writtenAt ? formatDate(work.writtenAt) : <span style={{ color: '#D1D5DB' }}>—</span>}
                                </td>
                                <td style={{ padding: '11px 16px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>{formatDate(work.createdAt)}</td>
                                <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                                    <button onClick={() => deleteWork(work.id)} style={{
                                        background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 12,
                                    }}>Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '14px 20px', borderTop: '1px solid #F3F4F6', background: '#FAFAFA',
                    }}>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>
                            Trang {pagination.page}/{pagination.totalPages}
                            &nbsp;·&nbsp;
                            {((pagination.page - 1) * pagination.limit + 1).toLocaleString('vi-VN')}
                            –{Math.min(pagination.page * pagination.limit, pagination.total).toLocaleString('vi-VN')}
                            &nbsp;/&nbsp;
                            {pagination.total.toLocaleString('vi-VN')} tác phẩm
                        </span>

                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <PagBtn label="«" onClick={() => goTo(1)} disabled={page === 1} />
                            <PagBtn label="‹" onClick={() => goTo(page - 1)} disabled={page === 1} />

                            {getPageNumbers().map((p, i) =>
                                p === '...'
                                    ? <span key={`el-${i}`} style={{ padding: '0 4px', color: '#9CA3AF' }}>…</span>
                                    : <PagBtn
                                        key={p}
                                        label={String(p)}
                                        onClick={() => goTo(Number(p))}
                                        active={p === page}
                                    />
                            )}

                            <PagBtn label="›" onClick={() => goTo(page + 1)} disabled={page === pagination.totalPages} />
                            <PagBtn label="»" onClick={() => goTo(pagination.totalPages)} disabled={page === pagination.totalPages} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function PagBtn({ label, onClick, disabled, active }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                minWidth: 32, height: 32, padding: '0 8px',
                border: active ? '1px solid #1F2937' : '1px solid #E5E7EB',
                borderRadius: 6, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
                background: active ? '#1F2937' : 'white',
                color: active ? 'white' : disabled ? '#D1D5DB' : '#374151',
                fontWeight: active ? 600 : 400,
            }}
        >
            {label}
        </button>
    )
}
