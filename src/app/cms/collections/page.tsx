'use client'

import { useState, useEffect } from 'react'

interface Collection {
    id: string; title: string; slug: string; description: string | null;
    coverImage: string | null; order: number; createdAt: string;
    _count: { works: number }
}

export default function CollectionsPage() {
    const [collections, setCollections] = useState<Collection[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [description, setDescription] = useState('')
    const [order, setOrder] = useState(0)
    const [error, setError] = useState('')

    const fetchCollections = async () => {
        setLoading(true)
        const res = await fetch('/api/collections')
        const data = await res.json()
        setCollections(data)
        setLoading(false)
    }

    useEffect(() => { fetchCollections() }, [])

    const toSlug = (str: string) =>
        str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const handleTitleChange = (val: string) => {
        setTitle(val)
        if (!editId) setSlug(toSlug(val))
    }

    const resetForm = () => {
        setTitle(''); setSlug(''); setDescription(''); setOrder(0)
        setEditId(null); setShowForm(false); setError('')
    }

    const handleSubmit = async () => {
        setError('')
        if (!title.trim() || !slug.trim()) { setError('Vui lòng nhập tiêu đề và slug'); return }

        const body = { title: title.trim(), slug: slug.trim(), description: description.trim() || null, order }
        const url = editId ? `/api/collections/${editId}` : '/api/collections'
        const method = editId ? 'PUT' : 'POST'

        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (!res.ok) {
            const data = await res.json()
            setError(data.error || 'Có lỗi xảy ra')
            return
        }
        resetForm()
        fetchCollections()
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa bộ sưu tập này?')) return
        await fetch(`/api/collections/${id}`, { method: 'DELETE' })
        fetchCollections()
    }

    const startEdit = (c: Collection) => {
        setEditId(c.id); setTitle(c.title); setSlug(c.slug)
        setDescription(c.description || ''); setOrder(c.order)
        setShowForm(true)
    }

    const inputStyle: React.CSSProperties = {
        padding: '8px 14px', border: '1px solid #D1D5DB', borderRadius: 8,
        fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%',
    }
    const btnStyle: React.CSSProperties = {
        padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        border: 'none', cursor: 'pointer',
    }

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>Bộ sưu tập</h1>
                <button onClick={() => { resetForm(); setShowForm(true) }}
                    style={{ ...btnStyle, background: '#1F2937', color: 'white' }}>+ Tạo mới</button>
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <div style={{
                    background: 'white', borderRadius: 12, padding: 20, marginBottom: 20,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6',
                }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16 }}>
                        {editId ? 'Chỉnh sửa bộ sưu tập' : 'Tạo bộ sưu tập mới'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Tiêu đề</label>
                            <input type="text" placeholder="Ví dụ: Thơ Thiếu Nhi" value={title}
                                onChange={e => handleTitleChange(e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Slug</label>
                            <input type="text" placeholder="tho-thieu-nhi" value={slug}
                                onChange={e => setSlug(e.target.value)} style={inputStyle} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Mô tả</label>
                            <textarea placeholder="Mô tả ngắn về bộ sưu tập..." value={description}
                                onChange={e => setDescription(e.target.value)}
                                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Thứ tự</label>
                            <input type="number" value={order}
                                onChange={e => setOrder(Number(e.target.value))} style={inputStyle} />
                        </div>
                    </div>
                    {error && <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</p>}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={handleSubmit}
                            style={{ ...btnStyle, background: '#1F2937', color: 'white' }}>{editId ? 'Cập nhật' : 'Tạo'}</button>
                        <button onClick={resetForm}
                            style={{ ...btnStyle, background: '#F3F4F6', color: '#374151' }}>Hủy</button>
                    </div>
                </div>
            )}

            {/* Collections table */}
            <div style={{
                background: 'white', borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Tiêu đề</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Slug</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Mô tả</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Số tác phẩm</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Thứ tự</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Đang tải...</td></tr>
                        ) : collections.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Chưa có bộ sưu tập nào.</td></tr>
                        ) : collections.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1F2937' }}>{c.title}</td>
                                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{c.slug}</td>
                                <td style={{ padding: '12px 16px', color: '#6B7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {c.description || '—'}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{c._count.works}</td>
                                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{c.order}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                        <button onClick={() => startEdit(c)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 12 }}>Sửa</button>
                                        <button onClick={() => handleDelete(c.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 12 }}>Xóa</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
