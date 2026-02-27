'use client'

import { useState, useEffect } from 'react'

interface Genre { id: string; value: string; label: string; emoji: string; order: number }

export default function GenresPage() {
    const [genres, setGenres] = useState<Genre[]>([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({ value: '', label: '', emoji: '📝', order: 0 })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const fetchGenres = async () => {
        setLoading(true)
        const res = await fetch('/api/genres')
        const data = await res.json()
        setGenres(data || [])
        setLoading(false)
    }

    useEffect(() => { fetchGenres() }, [])

    const resetForm = () => { setForm({ value: '', label: '', emoji: '📝', order: 0 }); setEditId(null); setError('') }

    const startEdit = (g: Genre) => {
        setEditId(g.id)
        setForm({ value: g.value, label: g.label, emoji: g.emoji, order: g.order })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true); setError('')
        try {
            const url = editId ? `/api/genres/${editId}` : '/api/genres'
            const method = editId ? 'PUT' : 'POST'
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Lỗi') }
            resetForm()
            fetchGenres()
        } catch (err: unknown) { setError((err as Error).message) }
        setSaving(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Xóa thể loại này?')) return
        await fetch(`/api/genres/${id}`, { method: 'DELETE' })
        fetchGenres()
    }

    const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }
    const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>Quản lý Thể loại</h1>

            {/* Add/Edit form */}
            <form onSubmit={handleSubmit} style={{ background: 'white', border: '1px solid #F3F4F6', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', marginBottom: 14 }}>{editId ? 'Chỉnh sửa thể loại' : 'Thêm thể loại mới'}</h3>
                {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', color: '#DC2626', fontSize: 12, marginBottom: 12 }}>{error}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px auto', gap: 12, alignItems: 'end' }}>
                    <label>
                        <span style={labelStyle}>Giá trị (value)</span>
                        <input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} required placeholder="poem" style={{ ...inputStyle, width: '100%' }} disabled={!!editId} />
                    </label>
                    <label>
                        <span style={labelStyle}>Nhãn hiển thị</span>
                        <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} required placeholder="Thơ" style={{ ...inputStyle, width: '100%' }} />
                    </label>
                    <label>
                        <span style={labelStyle}>Emoji</span>
                        <input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} style={{ ...inputStyle, width: '100%' }} />
                    </label>
                    <label>
                        <span style={labelStyle}>Thứ tự</span>
                        <input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, width: '100%' }} />
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" disabled={saving} style={{ padding: '8px 18px', background: saving ? '#9CA3AF' : '#1F2937', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                            {saving ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Thêm mới'}
                        </button>
                        {editId && <button type="button" onClick={resetForm} style={{ padding: '8px 14px', background: 'white', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>}
                    </div>
                </div>
            </form>

            {/* Genres list */}
            <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Emoji</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Giá trị</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Nhãn</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Thứ tự</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Đang tải...</td></tr>
                        ) : genres.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Chưa có thể loại nào. Hãy thêm mới!</td></tr>
                        ) : genres.map(g => (
                            <tr key={g.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '12px 16px', fontSize: 18 }}>{g.emoji}</td>
                                <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#6B7280' }}>{g.value}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{g.label}</td>
                                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{g.order}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <button onClick={() => startEdit(g)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 12, marginRight: 12 }}>Sửa</button>
                                    <button onClick={() => handleDelete(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 12 }}>Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
