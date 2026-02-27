import { prisma } from '@/lib/db'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Giới thiệu' }

export default async function AboutPage() {
    const author = await prisma.authorProfile.findFirst()
    if (!author) return <div className="public-shell" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 60 }}>Chưa có thông tin tác giả.</div>

    const awards = JSON.parse(author.awards || '[]') as { title: string; year: number; description: string }[]
    const publications = JSON.parse(author.publications || '[]') as { title: string; year?: number }[]

    return (
        <div className="public-shell">
            <header className="pub-header">
                <div className="pub-header-inner">
                    <Link href="/" className="pub-logo">Nguyễn Thế Hoàng Linh</Link>
                    <nav className="pub-nav">
                        <Link href="/tac-pham">Tác phẩm</Link>
                        <Link href="/sach">Sách</Link>
                        <Link href="/gioi-thieu">Giới thiệu</Link>
                        <Link href="/tim-kiem" className="nav-ai-btn">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                            </svg>
                            Hỏi AI
                        </Link>
                    </nav>
                </div>
            </header>

            <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px' }}>
                <div className="about-card" style={{ textAlign: 'center', marginBottom: 24 }}>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{author.name}</h1>
                    {author.bioShort && <p style={{ color: 'var(--text-muted)', fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 16 }}>{author.bioShort}</p>}
                    <div style={{ marginTop: 24, textAlign: 'left', color: 'var(--text-secondary)', fontFamily: "'Lora', serif", fontSize: 15, lineHeight: 1.85 }}>
                        {author.bio.split('\n\n').map((p, i) => <p key={i} style={{ marginBottom: '1.2em' }}>{p}</p>)}
                    </div>
                </div>

                {awards.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--text-primary)', marginBottom: 16 }}>Giải thưởng</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {awards.map((a, i) => (
                                <div key={i} className="about-card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>{a.year}</div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>{a.title}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>{a.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {publications.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--text-primary)', marginBottom: 16 }}>Ấn phẩm</h2>
                        <div className="about-card">
                            {publications.map((pub, i) => (
                                <div key={i} style={{ padding: '10px 0', borderBottom: i < publications.length - 1 ? '1px solid var(--border-light)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontFamily: "'Lora', serif", fontSize: 15 }}>{pub.title}</span>
                                    {pub.year && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{pub.year}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <a href="https://facebook.com/nguyenthehoanglinh" target="_blank" rel="noopener noreferrer" className="tag-pill" style={{ fontSize: 14, padding: '10px 24px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                        </svg>
                        Facebook
                    </a>
                </div>
            </div>

            <footer className="pub-footer">
                <p>© 2026 Nguyễn Thế Hoàng Linh</p>
            </footer>
        </div>
    )
}
