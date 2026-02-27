'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { slugify } from '@/lib/utils'

interface Tag { id: string; name: string; slug: string }
interface Col { id: string; title: string; slug: string }
interface Genre { id: string; value: string; label: string; emoji: string }

export default function EditWorkPage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string

    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [content, setContent] = useState('')
    const [excerpt, setExcerpt] = useState('')
    const [genre, setGenre] = useState('poem')
    const [status, setStatus] = useState('draft')
    const [isFeatured, setIsFeatured] = useState(false)
    const [featuredDate, setFeaturedDate] = useState('')
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [selectedCollections, setSelectedCollections] = useState<string[]>([])
    const [tags, setTags] = useState<Tag[]>([])
    const [collections, setCollections] = useState<Col[]>([])
    const [genres, setGenres] = useState<Genre[]>([])
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [coverImageUrl, setCoverImageUrl] = useState('')
    const [mediaFile, setMediaFile] = useState<File | null>(null)
    const [mediaPreview, setMediaPreview] = useState('')
    const [showTooltip, setShowTooltip] = useState(false)
    const [isDragging, setIsDragging] = useState(false)

    useEffect(() => {
        Promise.all([
            fetch('/api/tags').then(r => r.json()),
            fetch('/api/collections').then(r => r.json()),
            fetch(`/api/works/${id}`).then(r => r.json()),
            fetch('/api/genres').then(r => r.json()),
        ]).then(([tagsData, colsData, work, genresData]) => {
            setTags(tagsData.tags || tagsData || [])
            setCollections(colsData.collections || colsData || [])
            setGenres(genresData || [])
            if (work && !work.error) {
                setTitle(work.title || '')
                setSlug(work.slug || '')
                setContent(work.content || '')
                setExcerpt(work.excerpt || '')
                setGenre(work.genre || 'poem')
                setStatus(work.status || 'draft')
                setIsFeatured(work.isFeatured || false)
                setFeaturedDate(work.featuredDate ? new Date(work.featuredDate).toISOString().slice(0, 10) : '')
                setCoverImageUrl(work.coverImageUrl || '')
                setSelectedTags(work.tags?.map((t: { tagId: string }) => t.tagId) || [])
                setSelectedCollections(work.collections?.map((c: { collectionId: string }) => c.collectionId) || [])
                if (work.coverImageUrl) setMediaPreview(work.coverImageUrl)
            }
            setLoading(false)
        })
    }, [id])

    const isMediaGenre = genre === 'photo' || genre === 'video'

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setMediaFile(file)
        setMediaPreview(URL.createObjectURL(file))
        e.target.value = ''
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
            setMediaFile(file)
            setMediaPreview(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        try {
            let finalCoverImageUrl = coverImageUrl
            if (mediaFile) {
                const formData = new FormData()
                formData.append('file', mediaFile)
                const uploadRes = await fetch('/api/media', { method: 'POST', body: formData })
                if (!uploadRes.ok) throw new Error('Upload failed')
                const uploadData = await uploadRes.json()
                finalCoverImageUrl = uploadData.url
            }
            const res = await fetch(`/api/works/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title, slug, content, excerpt, genre, status,
                    isFeatured, featuredDate: featuredDate || null,
                    coverImageUrl: finalCoverImageUrl,
                    tagIds: selectedTags, collectionIds: selectedCollections,
                }),
            })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Lỗi') }
            router.push('/cms/works')
        } catch (err: unknown) { setError((err as Error).message) }
        setSaving(false)
    }

    const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }
    const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }
    const chipStyle = (active: boolean): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
        cursor: 'pointer', padding: '4px 10px', borderRadius: 100,
        border: `1px solid ${active ? '#0095F6' : '#DBDBDB'}`,
        background: active ? '#EBF5FF' : 'white',
        color: active ? '#0095F6' : '#8E8E8E',
        transition: 'all 0.15s',
        userSelect: 'none' as const,
    })

    if (loading) return <div style={{ fontFamily: "'Inter', sans-serif", padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Đang tải...</div>

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: isMediaGenre ? 980 : 800 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>Chỉnh sửa tác phẩm</h1>

            {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {isMediaGenre ? (
                    /* ════════════════════════════════════
                       INSTAGRAM-STYLE PHOTO FORM (no title, just caption)
                    ════════════════════════════════════ */
                    <>
                        {/* Top strip: genre only */}
                        <div style={{ background: 'white', borderRadius: 12, padding: '12px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A18' }}>📷 Chỉnh sửa {genre === 'video' ? 'video' : 'ảnh'}</span>
                            <select value={genre} onChange={e => setGenre(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
                                {genres.map(g => <option key={g.value} value={g.value}>{g.emoji} {g.label}</option>)}
                            </select>
                        </div>

                        {/* Instagram split panel */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 360px',
                            borderRadius: 16, overflow: 'hidden',
                            border: '1px solid #DBDBDB',
                            minHeight: 560, marginBottom: 20,
                            boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
                        }}>
                            {/* Left: Image upload / preview */}
                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={!mediaPreview ? () => document.getElementById('media-upload-edit')?.click() : undefined}
                                style={{
                                    background: isDragging ? '#0d0d0d' : '#1A1A1A',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative', overflow: 'hidden', minHeight: 400,
                                    cursor: mediaPreview ? 'default' : 'pointer',
                                    transition: 'background 0.2s',
                                    outline: isDragging ? '3px solid #0095F6' : 'none',
                                    outlineOffset: -3,
                                }}
                            >
                                {mediaPreview ? (
                                    <>
                                        {(mediaFile?.type?.startsWith('video/') || (!mediaFile && mediaPreview.match(/\.(mp4|webm|ogg|mov)$/i))) ? (
                                            <video src={mediaPreview} controls style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: 560 }} />
                                        ) : (
                                            <img src={mediaPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: 560, display: 'block' }} />
                                        )}
                                        <div style={{
                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
                                            padding: '40px 16px 16px',
                                            display: 'flex', justifyContent: 'flex-end', gap: 8,
                                        }}>
                                            <button type="button"
                                                onClick={e => { e.stopPropagation(); document.getElementById('media-upload-edit')?.click() }}
                                                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                Đổi ảnh
                                            </button>
                                            <button type="button"
                                                onClick={e => { e.stopPropagation(); setMediaFile(null); setMediaPreview(''); setCoverImageUrl('') }}
                                                style={{ background: 'rgba(239,68,68,0.85)', backdropFilter: 'blur(8px)', color: 'white', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                Xóa
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '0 40px', userSelect: 'none' }}>
                                        <svg width="76" height="76" viewBox="0 0 24 24" fill="none"
                                            stroke={isDragging ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)'}
                                            strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
                                            style={{ marginBottom: 20, transition: 'stroke 0.2s' }}>
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                            <circle cx="12" cy="13" r="4" />
                                        </svg>
                                        <p style={{ color: isDragging ? 'white' : 'rgba(255,255,255,0.8)', fontSize: 22, fontWeight: 300, marginBottom: 8, letterSpacing: '-0.02em', transition: 'color 0.2s' }}>
                                            {isDragging ? 'Thả ảnh vào đây' : 'Kéo thả ảnh vào đây'}
                                        </p>
                                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
                                            hoặc chọn từ máy tính của bạn
                                        </p>
                                        <button type="button"
                                            onClick={(e) => { e.stopPropagation(); document.getElementById('media-upload-edit')?.click() }}
                                            style={{ background: '#0095F6', color: 'white', border: 'none', borderRadius: 10, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                            Chọn từ máy tính
                                        </button>
                                        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 20, letterSpacing: '0.05em' }}>
                                            JPEG · PNG · WebP · GIF · MP4
                                        </p>
                                    </div>
                                )}
                            </div>
                            <input id="media-upload-edit" type="file" accept="image/*,video/*" onChange={handleMediaChange} style={{ display: 'none' }} />

                            {/* Right: Details panel */}
                            <div style={{ background: 'white', borderLeft: '1px solid #DBDBDB', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                                {/* Author strip */}
                                <div style={{ padding: '14px 18px', borderBottom: '1px solid #EFEFEF', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                    <div style={{
                                        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontSize: 14, fontWeight: 700,
                                    }}>N</div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A18', lineHeight: 1.3 }}>nguyenthehoanglinh</div>
                                        <div style={{ fontSize: 11, color: '#8E8E8E', marginTop: 2 }}>Nguyễn Thế Hoàng Linh</div>
                                    </div>
                                </div>

                                {/* Caption textarea */}
                                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 0 150px' }}>
                                    <textarea
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        placeholder="Viết caption..."
                                        style={{
                                            flex: 1, border: 'none', outline: 'none', resize: 'none',
                                            fontSize: 15, fontFamily: "'Inter', sans-serif", lineHeight: 1.6,
                                            color: '#1A1A18', background: 'transparent', padding: '14px 18px',
                                            minHeight: 130, boxSizing: 'border-box',
                                        }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 18px 10px', fontSize: 11, color: '#C7C7C7' }}>
                                        {content.length} / 2.200
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid #EFEFEF' }} />

                                {/* Settings rows */}
                                <div>
                                    <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 14, color: '#262626' }}>Trạng thái</span>
                                        <select value={status} onChange={e => setStatus(e.target.value)}
                                            style={{ border: 'none', background: 'transparent', fontSize: 14, color: '#8E8E8E', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                                            <option value="draft">Bản nháp</option>
                                            <option value="published">Đã xuất bản</option>
                                        </select>
                                    </div>
                                    <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #EFEFEF' }}>
                                        <span style={{ fontSize: 14, color: '#262626' }}>Nổi bật</span>
                                        <button type="button" onClick={() => setIsFeatured(!isFeatured)}
                                            style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: isFeatured ? '#0095F6' : '#DBDBDB', cursor: 'pointer', position: 'relative', transition: 'background 0.25s', padding: 0, flexShrink: 0 }}>
                                            <span style={{ position: 'absolute', top: 2, left: isFeatured ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.25s', display: 'block' }} />
                                        </button>
                                    </div>
                                </div>

                                {/* Tags */}
                                {tags.length > 0 && (
                                    <div style={{ borderTop: '1px solid #EFEFEF', padding: '14px 18px' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 10 }}>Tags</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {tags.map(t => (
                                                <label key={t.id} style={chipStyle(selectedTags.includes(t.id))}>
                                                    <input type="checkbox" checked={selectedTags.includes(t.id)} style={{ display: 'none' }}
                                                        onChange={e => setSelectedTags(e.target.checked ? [...selectedTags, t.id] : selectedTags.filter(id => id !== t.id))} />
                                                    {t.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Collections */}
                                {collections.length > 0 && (
                                    <div style={{ borderTop: '1px solid #EFEFEF', padding: '14px 18px' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 10 }}>Bộ sưu tập</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {collections.map(c => (
                                                <label key={c.id} style={chipStyle(selectedCollections.includes(c.id))}>
                                                    <input type="checkbox" checked={selectedCollections.includes(c.id)} style={{ display: 'none' }}
                                                        onChange={e => setSelectedCollections(e.target.checked ? [...selectedCollections, c.id] : selectedCollections.filter(id => id !== c.id))} />
                                                    {c.title}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button type="submit" disabled={saving}
                                style={{ padding: '10px 28px', background: saving ? '#9CA3AF' : '#0095F6', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                            <button type="button" onClick={() => router.back()}
                                style={{ padding: '10px 24px', background: 'white', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Hủy
                            </button>
                        </div>
                    </>
                ) : (
                    /* ════════════════════════════════════
                       STANDARD TEXT FORM
                    ════════════════════════════════════ */
                    <>
                        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', marginBottom: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <label><span style={labelStyle}>Tiêu đề</span><input value={title} onChange={e => setTitle(e.target.value)} required style={inputStyle} /></label>
                                <label>
                                    <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        Slug
                                        <span onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}
                                            style={{ position: 'relative', cursor: 'help', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: '#E5E7EB', color: '#6B7280', fontSize: 11, fontWeight: 700 }}>
                                            ?
                                            {showTooltip && (
                                                <span style={{ position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)', background: '#1F2937', color: 'white', fontSize: 12, fontWeight: 400, padding: '8px 12px', borderRadius: 6, whiteSpace: 'nowrap', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                                    Slug là phần đuôi URL thân thiện.<br />Ví dụ: &quot;bat-nat&quot; → /tac-pham/bat-nat<br />Tự động tạo từ tiêu đề.
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                    <input value={slug} onChange={e => setSlug(e.target.value)} required style={inputStyle} />
                                </label>
                            </div>

                            <label style={{ marginBottom: 16, display: 'block' }}><span style={labelStyle}>Nội dung</span>
                                <textarea value={content} onChange={e => setContent(e.target.value)} rows={12} required
                                    style={{ ...inputStyle, fontFamily: "'Lora', 'Georgia', serif", lineHeight: 1.9, resize: 'vertical' }} />
                            </label>

                            <label style={{ marginBottom: 16, display: 'block' }}><span style={labelStyle}>Trích đoạn</span>
                                <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                            </label>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <label><span style={labelStyle}>Thể loại</span>
                                    <select value={genre} onChange={e => setGenre(e.target.value)} style={inputStyle}>
                                        {genres.map(g => <option key={g.value} value={g.value}>{g.emoji} {g.label}</option>)}
                                    </select>
                                </label>
                                <label><span style={labelStyle}>Trạng thái</span>
                                    <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                                        <option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option>
                                    </select>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                                    <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} />
                                    <span style={{ fontSize: 13, color: '#374151' }}>Nổi bật</span>
                                </label>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                                <label>
                                    <span style={labelStyle}>📅 Tác phẩm của ngày</span>
                                    <input type="date" value={featuredDate} onChange={e => setFeaturedDate(e.target.value)}
                                        style={{ ...inputStyle, color: featuredDate ? '#8B6F47' : '#9CA3AF' }} />
                                    <span style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, display: 'block' }}>Đặt ngày để spotlight trên trang chủ</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                                    <button type="button" onClick={() => setFeaturedDate('')}
                                        style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}
                                        disabled={!featuredDate}>Xóa ngày</button>
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', marginBottom: 12 }}>Tags</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {tags.map(t => (
                                        <label key={t.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer',
                                            padding: '4px 10px', borderRadius: 100, border: '1px solid #E5E7EB',
                                            background: selectedTags.includes(t.id) ? '#1F2937' : 'white',
                                            color: selectedTags.includes(t.id) ? 'white' : '#374151',
                                        }}>
                                            <input type="checkbox" checked={selectedTags.includes(t.id)} style={{ display: 'none' }}
                                                onChange={e => setSelectedTags(e.target.checked ? [...selectedTags, t.id] : selectedTags.filter(id => id !== t.id))} />
                                            {t.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', marginBottom: 12 }}>Bộ sưu tập</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {collections.map(c => (
                                        <label key={c.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer',
                                            padding: '4px 10px', borderRadius: 100, border: '1px solid #E5E7EB',
                                            background: selectedCollections.includes(c.id) ? '#1F2937' : 'white',
                                            color: selectedCollections.includes(c.id) ? 'white' : '#374151',
                                        }}>
                                            <input type="checkbox" checked={selectedCollections.includes(c.id)} style={{ display: 'none' }}
                                                onChange={e => setSelectedCollections(e.target.checked ? [...selectedCollections, c.id] : selectedCollections.filter(id => id !== c.id))} />
                                            {c.title}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button type="submit" disabled={saving}
                                style={{ padding: '10px 24px', background: saving ? '#9CA3AF' : '#1F2937', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                            <button type="button" onClick={() => router.back()}
                                style={{ padding: '10px 24px', background: 'white', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Hủy
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>
    )
}
