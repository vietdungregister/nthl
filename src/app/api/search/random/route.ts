import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        const works = await prisma.$queryRaw<Array<{
            id: string
            title: string
            slug: string
            genre: string
            excerpt: string | null
            content: string
        }>>`
            SELECT id, title, slug, genre, excerpt, content
            FROM "Work"
            WHERE status = 'published'
              AND "deletedAt" IS NULL
              AND genre = 'poem'
              AND content IS NOT NULL
              AND length(content) > 20
            ORDER BY RANDOM()
            LIMIT 1
        `

        if (!works.length) {
            return NextResponse.json({ error: 'Không tìm thấy bài thơ' }, { status: 404 })
        }

        return NextResponse.json(works[0])
    } catch (error) {
        console.error('[Random] error:', error)
        return NextResponse.json({ error: 'Có lỗi xảy ra' }, { status: 500 })
    }
}
