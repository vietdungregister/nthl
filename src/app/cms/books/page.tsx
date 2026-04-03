'use client'

import { useState, useEffect } from 'react'
import { slugify } from '@/lib/utils'

interface Book { id: string; title: string; slug: string; description: string | null; coverImage: string | null; buyUrl: string | null; publisher: string | null; year: number | null; order: number }

export default function BooksPage() {
    const [books, setBooks] = useState<Book[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({ title: '', slug: '', description: '', coverImage: '', buyUrl: '', publisher: '', year: '', order: 0 })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [mediaFile, setMediaFile] = useState<File | null>(null)
    const [mediaPreview, setMediaPreview] = useState('')

    const fetchBooks = async () => {
        setLoading(true)
        const res = await fetch('/api/books')
        const data = await res.json()
        setBooks(data || [])
        setLoading(false)
    }

    useEffect(() => { fetchBooks() }, [])

    const resetForm = () => {
        setForm({ title: '', slug: '', description: '', coverImage: '', buyUrl: '', publisher: '', year: '', order: 0 })
        setEditId(null); setShowForm(false); setError(''); setMediaFile(null); setMediaPreview('')
    }

    const startEdit = (b: Book) => {
        setEditId(b.id)
        setForm({
            title: b.title, slug: b.slug, description: b.description || '', coverImage: b.coverImage || '',
            buyUrl: b.buyUrl || '', publisher: b.publisher || '', year: b.year ? String(b.year) : '', order: b.order
        })
        if (b.coverImage) setMediaPreview(b.coverImage)
        setShowForm(true)
    }

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setMediaFile(file)
        setMediaPreview(URL.createObjectURL(file))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true); setError('')
        try {
            let coverImage = form.coverImage
            if (mediaFile) {
                const formData = new FormData()
                formData.append('file', mediaFile)
                const uploadRes = await fetch('/api/media', { method: 'POST', body: formData })
                if (!uploadRes.ok) throw new Error('Upload failed')
                const uploadData = await uploadRes.json()
                coverImage = uploadData.url
            }
            const url = editId ? `/api/books/${editId}` : '/api/books'
            const method = editId ? 'PUT' : 'POST'
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, coverImage, year: form.year ? parseInt(form.year) : null }),
            })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Lỗi') }
            resetForm()
            fetchBooks()
        } catch (err: unknown) { setError((err as Error).message) }
        setSaving(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Xóa sách này?')) return
        await fetch(`/api/books/${id}`, { method: 'DELETE' })
        fetchBooks()
    }

    const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }
    const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>Quản lý Sách</h1>
                <button onClick={() => { resetForm(); setShowForm(true) }} style={{ padding: '8px 18px', background: '#1F2937', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Thêm sách</button>
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: 'white', border: '1px solid #F3F4F6', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>{editId ? 'Chỉnh sửa sách' : 'Thêm sách mới'}</h3>
                    {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', color: '#DC2626', fontSize: 12, marginBottom: 12 }}>{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <label><span style={labelStyle}>Tên sách *</span>
                            <input value={form.title} onChange={e => { setForm({ ...form, title: e.target.value, slug: slugify(e.target.value) }) }} required style={inputStyle} />
                        </label>
                        <label><span style={labelStyle}>Slug</span>
                            <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required style={inputStyle} />
                        </label>
                    </div>

                    <label style={{ display: 'block', marginBottom: 16 }}><span style={labelStyle}>Mô tả</span>
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', gap: 16, marginBottom: 16 }}>
                        <label><span style={labelStyle}>Link mua</span>
                            <input value={form.buyUrl} onChange={e => setForm({ ...form, buyUrl: e.target.value })} style={inputStyle} placeholder="https://..." />
                        </label>
                        <label><span style={labelStyle}>Nhà xuất bản</span>
                            <input value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} style={inputStyle} />
                        </label>
                        <label><span style={labelStyle}>Năm xuất bản</span>
                            <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} style={inputStyle} placeholder="2024" />
                        </label>
                        <label><span style={labelStyle}>Thứ tự</span>
                            <input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} style={inputStyle} />
                        </label>
                    </div>

                    {/* Cover image upload */}
                    <div style={{ marginBottom: 20 }}>
                        <span style={labelStyle}>Ảnh bìa</span>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
                            {mediaPreview && (
                                <img src={mediaPreview} alt="Preview" style={{ width: 100, height: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E7EB' }} />
                            )}
                            <div>
                                <input type="file" accept="image/*" onChange={handleMediaChange} style={{ fontSize: 13 }} />
                                {mediaPreview && <button type="button" onClick={() => { setMediaFile(null); setMediaPreview(''); setForm({ ...form, coverImage: '' }) }} style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Xóa ảnh</button>}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: saving ? '#9CA3AF' : '#1F2937', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                            {saving ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Thêm sách'}
                        </button>
                        <button type="button" onClick={resetForm} style={{ padding: '10px 24px', background: 'white', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
                    </div>
                </form>
            )}

            {/* Books list */}
            <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Bìa</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Tên sách</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>NXB</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Năm</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Link mua</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Đang tải...</td></tr>
                        ) : books.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Chưa có sách nào.</td></tr>
                        ) : books.map(b => (
                            <tr key={b.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '8px 16px' }}>
                                    {b.coverImage ? <img src={b.coverImage} alt={b.title} style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 40, height: 56, background: '#F3F4F6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📕</div>}
                                </td>
                                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{b.title}</td>
                                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{b.publisher || '—'}</td>
                                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{b.year || '—'}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    {b.buyUrl ? <a href={b.buyUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'none', fontSize: 12 }}>Mở link ↗</a> : <span style={{ color: '#9CA3AF' }}>—</span>}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <button onClick={() => startEdit(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 12, marginRight: 12 }}>Sửa</button>
                                    <button onClick={() => handleDelete(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 12 }}>Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
