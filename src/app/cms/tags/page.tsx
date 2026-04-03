'use client'

import { useState, useEffect } from 'react'

interface Tag {
    id: string; name: string; slug: string;
    _count: { works: number }
}

export default function TagsPage() {
    const [tags, setTags] = useState<Tag[]>([])
    const [loading, setLoading] = useState(true)
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [editId, setEditId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editSlug, setEditSlug] = useState('')
    const [error, setError] = useState('')

    const fetchTags = async () => {
        setLoading(true)
        const res = await fetch('/api/tags')
        const data = await res.json()
        setTags(data)
        setLoading(false)
    }

    useEffect(() => { fetchTags() }, [])

    const toSlug = (str: string) =>
        str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const handleNameChange = (val: string) => {
        setName(val)
        setSlug(toSlug(val))
    }

    const handleCreate = async () => {
        setError('')
        if (!name.trim() || !slug.trim()) { setError('Vui lòng nhập tên và slug'); return }
        const res = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
        })
        if (!res.ok) {
            const data = await res.json()
            setError(data.error || 'Có lỗi xảy ra')
            return
        }
        setName(''); setSlug('')
        fetchTags()
    }

    const handleUpdate = async (id: string) => {
        if (!editName.trim() || !editSlug.trim()) return
        const res = await fetch(`/api/tags/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim() }),
        })
        if (res.ok) { setEditId(null); fetchTags() }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa tag này?')) return
        await fetch(`/api/tags/${id}`, { method: 'DELETE' })
        fetchTags()
    }

    const startEdit = (tag: Tag) => {
        setEditId(tag.id); setEditName(tag.name); setEditSlug(tag.slug)
    }

    const inputStyle: React.CSSProperties = {
        padding: '8px 14px', border: '1px solid #D1D5DB', borderRadius: 8,
        fontSize: 13, outline: 'none', fontFamily: 'inherit',
    }
    const btnStyle: React.CSSProperties = {
        padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        border: 'none', cursor: 'pointer',
    }

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>Quản lý Tag</h1>

            {/* Create new tag */}
            <div style={{
                background: 'white', borderRadius: 12, padding: 20, marginBottom: 20,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6',
            }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Thêm tag mới</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Tên</label>
                        <input type="text" placeholder="Ví dụ: Thơ tình" value={name}
                            onChange={e => handleNameChange(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Slug</label>
                        <input type="text" placeholder="tho-tinh" value={slug}
                            onChange={e => setSlug(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                    </div>
                    <button onClick={handleCreate}
                        style={{ ...btnStyle, background: '#1F2937', color: 'white' }}>+ Thêm</button>
                </div>
                {error && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>{error}</p>}
            </div>

            {/* Tags table */}
            <div style={{
                background: 'white', borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Tên</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Slug</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Số tác phẩm</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Đang tải...</td></tr>
                        ) : tags.length === 0 ? (
                            <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Chưa có tag nào.</td></tr>
                        ) : tags.map(tag => (
                            <tr key={tag.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '10px 16px' }}>
                                    {editId === tag.id ? (
                                        <input value={editName} onChange={e => setEditName(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                                    ) : <span style={{ fontWeight: 500, color: '#1F2937' }}>{tag.name}</span>}
                                </td>
                                <td style={{ padding: '10px 16px', color: '#6B7280' }}>
                                    {editId === tag.id ? (
                                        <input value={editSlug} onChange={e => setEditSlug(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                                    ) : tag.slug}
                                </td>
                                <td style={{ padding: '10px 16px', color: '#6B7280' }}>{tag._count.works}</td>
                                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                    {editId === tag.id ? (
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleUpdate(tag.id)}
                                                style={{ ...btnStyle, background: '#059669', color: 'white', padding: '6px 14px' }}>Lưu</button>
                                            <button onClick={() => setEditId(null)}
                                                style={{ ...btnStyle, background: '#F3F4F6', color: '#374151', padding: '6px 14px' }}>Hủy</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button onClick={() => startEdit(tag)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 12 }}>Sửa</button>
                                            <button onClick={() => handleDelete(tag.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 12 }}>Xóa</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
