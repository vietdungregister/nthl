'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const menuItems = [
    { href: '/cms/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/cms/works', label: 'Tác phẩm', icon: '📝' },
    { href: '/cms/genres', label: 'Thể loại', icon: '🎭' },
    { href: '/cms/collections', label: 'Bộ sưu tập', icon: '📚' },
    { href: '/cms/books', label: 'Sách', icon: '📕' },
    { href: '/cms/tags', label: 'Tag', icon: '🏷️' },
    { href: '/cms/media', label: 'Media', icon: '🖼️' },
    { href: '/cms/settings', label: 'Cài đặt', icon: '⚙️' },
]

export default function CmsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    if (pathname === '/cms/login') return <>{children}</>

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#FFFFFF' }}>
            {/* Sidebar */}
            <aside style={{
                width: 256, flexShrink: 0, backgroundColor: '#1F2937', color: 'white',
                display: 'flex', flexDirection: 'column',
            }}>
                <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <Link href="/cms/dashboard" style={{ textDecoration: 'none', color: 'white' }}>
                        <h2 style={{ fontWeight: 700, fontSize: 18, fontFamily: "'Playfair Display', serif" }}>NTHL</h2>
                        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Quản lý tác phẩm</p>
                    </Link>
                </div>

                <nav style={{ flex: 1, paddingTop: 16 }}>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 20px', fontSize: 14, textDecoration: 'none',
                                    backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: isActive ? 'white' : '#D1D5DB',
                                    transition: 'background-color 0.15s',
                                }}
                            >
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Link href="/" target="_blank" style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'none' }}>
                            🌐 Trang public
                        </Link>
                        <button
                            onClick={() => signOut({ callbackUrl: '/cms/login' })}
                            style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main style={{ flex: 1, overflow: 'auto', backgroundColor: '#F9FAFB' }}>
                <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
                    {children}
                </div>
            </main>
        </div>
    )
}
