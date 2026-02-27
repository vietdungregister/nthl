import { prisma } from '@/lib/db'
import Link from 'next/link'
import type { Metadata } from 'next'
import AILibrarian from '@/components/public/AILibrarian'

export const metadata: Metadata = { title: 'Tìm kiếm' }

interface Props { searchParams: Promise<{ q?: string }> }

export default async function SearchPage({ searchParams }: Props) {
    const sp = await searchParams
    const query = sp.q?.trim() || ''

    // Nếu không có query → chỉ hiện Thủ Thư AI
    if (!query) return <AILibrarian />

    // Có query → tìm kiếm thông thường + hiện Thủ Thư AI bên dưới
    const works = await prisma.work.findMany({
        where: {
            status: 'published', deletedAt: null,
            OR: [
                { title: { contains: query } },
                { content: { contains: query } },
                { excerpt: { contains: query } },
            ],
        },
        orderBy: { publishedAt: 'desc' },
        take: 50,
    })

    return (
        <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                Tìm thấy <strong style={{ color: 'var(--text-primary)' }}>{works.length}</strong> kết quả cho &ldquo;{query}&rdquo;
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
                {works.map(work => (
                    <Link key={work.id} href={`/tac-pham/${work.slug}`} className="poem-card" style={{ minHeight: 'auto' }}>
                        <div className="poem-card__title">{work.title}</div>
                        <div className="poem-card__excerpt">{work.excerpt || work.content.slice(0, 100)}</div>
                    </Link>
                ))}
                {works.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                        Không tìm thấy kết quả nào.
                    </div>
                )}
            </div>

            <AILibrarian />
        </div>
    )
}
