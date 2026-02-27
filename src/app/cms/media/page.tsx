'use client'

import { useState, useEffect, useRef } from 'react'

interface MediaItem {
    id: string; filename: string; url: string; type: string;
    size: number; width: number | null; height: number | null;
    altText: string | null; createdAt: string;
}

function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function MediaPage() {
    const [media, setMedia] = useState<MediaItem[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const fetchMedia = async () => {
        setLoading(true)
        const res = await fetch('/api/media')
        const data = await res.json()
        setMedia(data)
        setLoading(false)
    }

    useEffect(() => { fetchMedia() }, [])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        setUploading(true)
        for (let i = 0; i < files.length; i++) {
            const formData = new FormData()
            formData.append('file', files[i])
            await fetch('/api/media', { method: 'POST', body: formData })
        }
        setUploading(false)
        if (fileRef.current) fileRef.current.value = ''
        fetchMedia()
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa file này?')) return
        await fetch(`/api/media/${id}`, { method: 'DELETE' })
        if (selectedId === id) setSelectedId(null)
        fetchMedia()
    }

    const copyUrl = (url: string) => {
        navigator.clipboard.writeText(window.location.origin + url)
        alert('Đã copy URL!')
    }

    const selected = media.find(m => m.id === selectedId)

    const btnStyle: React.CSSProperties = {
        padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        border: 'none', cursor: 'pointer',
    }

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>Media</h1>
                <div>
                    <input type="file" ref={fileRef} multiple accept="image/*,.pdf,.doc,.docx"
                        onChange={handleUpload} style={{ display: 'none' }} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        style={{ ...btnStyle, background: '#1F2937', color: 'white', opacity: uploading ? 0.6 : 1 }}>
                        {uploading ? 'Đang tải lên...' : '+ Upload'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 20 }}>
                {/* Media grid */}
                <div style={{ flex: 1 }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Đang tải...</div>
                    ) : media.length === 0 ? (
                        <div style={{
                            padding: 60, textAlign: 'center', color: '#9CA3AF', background: 'white',
                            borderRadius: 12, border: '2px dashed #E5E7EB',
                        }}>
                            <p style={{ fontSize: 16, marginBottom: 8 }}>📁 Chưa có file nào</p>
                            <p style={{ fontSize: 13 }}>Nhấn nút Upload để tải file lên</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: 12,
                        }}>
                            {media.map(m => (
                                <div key={m.id} onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                                    style={{
                                        background: 'white', borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                                        border: m.id === selectedId ? '2px solid #3B82F6' : '1px solid #F3F4F6',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'border 0.15s',
                                    }}>
                                    <div style={{
                                        height: 120, background: '#F9FAFB', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                    }}>
                                        {m.type === 'image' ? (
                                            <img src={m.url} alt={m.altText || m.filename}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: 32 }}>📄</span>
                                        )}
                                    </div>
                                    <div style={{ padding: '8px 10px' }}>
                                        <p style={{
                                            fontSize: 11, fontWeight: 500, color: '#374151',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>{m.filename}</p>
                                        <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{formatSize(m.size)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail panel */}
                {selected && (
                    <div style={{
                        width: 280, flexShrink: 0, background: 'white', borderRadius: 12,
                        padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6',
                        alignSelf: 'flex-start', position: 'sticky', top: 24,
                    }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Chi tiết</h3>
                        {selected.type === 'image' && (
                            <img src={selected.url} alt={selected.altText || selected.filename}
                                style={{ width: '100%', borderRadius: 8, marginBottom: 12 }} />
                        )}
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                            <p style={{ marginBottom: 6 }}><strong>Tên:</strong> {selected.filename}</p>
                            <p style={{ marginBottom: 6 }}><strong>Loại:</strong> {selected.type}</p>
                            <p style={{ marginBottom: 6 }}><strong>Kích thước:</strong> {formatSize(selected.size)}</p>
                            {selected.width && <p style={{ marginBottom: 6 }}><strong>Chiều rộng:</strong> {selected.width}px</p>}
                            {selected.height && <p style={{ marginBottom: 6 }}><strong>Chiều cao:</strong> {selected.height}px</p>}
                            <p style={{ marginBottom: 12 }}><strong>URL:</strong>
                                <span style={{ wordBreak: 'break-all', color: '#3B82F6', marginLeft: 4 }}>{selected.url}</span>
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => copyUrl(selected.url)}
                                style={{ ...btnStyle, flex: 1, background: '#EFF6FF', color: '#3B82F6', padding: '6px 12px' }}>Copy URL</button>
                            <button onClick={() => handleDelete(selected.id)}
                                style={{ ...btnStyle, flex: 1, background: '#FEF2F2', color: '#EF4444', padding: '6px 12px' }}>Xóa</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
