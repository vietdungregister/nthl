'use client'

import { useState, useEffect } from 'react'

export default function SettingsPage() {
    const [name, setName] = useState('')
    const [bio, setBio] = useState('')
    const [bioShort, setBioShort] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [coverImageUrl, setCoverImageUrl] = useState('')
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        fetch('/api/author')
            .then(r => r.json())
            .then(data => {
                setName(data.name || '')
                setBio(data.bio || '')
                setBioShort(data.bioShort || '')
                setAvatarUrl(data.avatarUrl || '')
                setCoverImageUrl(data.coverImageUrl || '')
            })
    }, [])

    const handleUpload = async (file: File, setter: (url: string) => void) => {
        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        try {
            const res = await fetch('/api/media', { method: 'POST', body: formData })
            if (res.ok) {
                const data = await res.json()
                setter(data.url)
            }
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setMessage('')
        try {
            const res = await fetch('/api/author', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, bio, bioShort, avatarUrl, coverImageUrl }),
            })
            if (res.ok) {
                setMessage('Đã lưu thành công!')
            } else {
                setMessage('Lỗi khi lưu. Vui lòng thử lại.')
            }
        } finally {
            setSaving(false)
            setTimeout(() => setMessage(''), 3000)
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700 }}>Cài đặt tác giả</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '10px 24px',
                        background: '#8B6F47',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: 'pointer',
                        opacity: saving ? 0.6 : 1,
                    }}
                >
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
            </div>

            {message && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 20,
                    background: message.includes('thành công') ? '#DEF7EC' : '#FDE8E8',
                    color: message.includes('thành công') ? '#03543F' : '#9B1C1C',
                    fontSize: 14,
                }}>
                    {message}
                </div>
            )}

            <div style={{ display: 'grid', gap: 24, maxWidth: 700 }}>
                {/* Avatar */}
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ảnh đại diện</label>
                        <div style={{
                            width: 120,
                            height: 120,
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: '#F3F4F6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px dashed #D1D5DB',
                        }}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            )}
                        </div>
                        <label style={{
                            display: 'inline-block',
                            marginTop: 8,
                            padding: '6px 16px',
                            background: '#F3F4F6',
                            borderRadius: 6,
                            fontSize: 13,
                            cursor: 'pointer',
                            fontWeight: 500,
                        }}>
                            {uploading ? 'Đang tải...' : 'Chọn ảnh'}
                            <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], setAvatarUrl)} />
                        </label>
                    </div>

                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ảnh bìa</label>
                        <div style={{
                            width: '100%',
                            height: 120,
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: '#F3F4F6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px dashed #D1D5DB',
                        }}>
                            {coverImageUrl ? (
                                <img src={coverImageUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                            )}
                        </div>
                        <label style={{
                            display: 'inline-block',
                            marginTop: 8,
                            padding: '6px 16px',
                            background: '#F3F4F6',
                            borderRadius: 6,
                            fontSize: 13,
                            cursor: 'pointer',
                            fontWeight: 500,
                        }}>
                            {uploading ? 'Đang tải...' : 'Chọn ảnh bìa'}
                            <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], setCoverImageUrl)} />
                        </label>
                    </div>
                </div>

                {/* Name */}
                <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Tên tác giả</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 }}
                    />
                </div>

                {/* Bio Short */}
                <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Tiểu sử ngắn</label>
                    <input
                        type="text"
                        value={bioShort}
                        onChange={e => setBioShort(e.target.value)}
                        placeholder="Vd: Nhà thơ · Nhà văn"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 }}
                    />
                </div>

                {/* Bio */}
                <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Tiểu sử đầy đủ</label>
                    <textarea
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        rows={6}
                        placeholder="Giới thiệu chi tiết về tác giả..."
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, resize: 'vertical' }}
                    />
                </div>
            </div>
        </div>
    )
}
