'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        const res = await signIn('credentials', { email, password, redirect: false })
        setLoading(false)
        if (res?.error) setError('Tài khoản hoặc mật khẩu không đúng.')
        else router.push('/cms/dashboard')
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            fontFamily: "'Inter', sans-serif",
        }}>
            <div style={{
                width: 400, background: '#FFFFFF', borderRadius: 16, padding: '40px 36px',
                boxShadow: '0 4px 32px rgba(0,0,0,0.25)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <h1 style={{
                        fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 24,
                        color: '#1F2937', marginBottom: 4,
                    }}>Nguyễn Thế Hoàng Linh</h1>
                    <p style={{ color: '#9CA3AF', fontSize: 13 }}>Quản lý tác phẩm</p>
                </div>

                {error && (
                    <div style={{
                        background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
                        padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16,
                    }}>{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <label style={{ display: 'block', marginBottom: 16 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Tài khoản</span>
                        <input type="text" value={email} onChange={e => setEmail(e.target.value)} required
                            style={{
                                width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8,
                                fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                            }} />
                    </label>

                    <label style={{ display: 'block', marginBottom: 24 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Mật khẩu</span>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                            style={{
                                width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8,
                                fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                            }} />
                    </label>

                    <button type="submit" disabled={loading}
                        style={{
                            width: '100%', padding: '12px', border: 'none', borderRadius: 8,
                            background: loading ? '#9CA3AF' : '#1F2937', color: 'white',
                            fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
                            fontFamily: 'inherit', transition: 'background 0.15s',
                        }}>
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 20 }}>
                    Thư viện tác phẩm — Nguyễn Thế Hoàng Linh
                </p>
            </div>
        </div>
    )
}
