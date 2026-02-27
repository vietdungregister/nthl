import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

// GET /api/genres - List all genres
export async function GET() {
    const genres = await prisma.genre.findMany({
        orderBy: { order: 'asc' },
    })
    return NextResponse.json(genres)
}

// POST /api/genres - Create a new genre
export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { value, label, emoji, order } = body

    if (!value || !label) {
        return NextResponse.json({ error: 'Missing required fields (value, label)' }, { status: 400 })
    }

    const existing = await prisma.genre.findUnique({ where: { value } })
    if (existing) return NextResponse.json({ error: 'Genre value already exists' }, { status: 400 })

    const genre = await prisma.genre.create({
        data: { value, label, emoji: emoji || '📝', order: order ?? 0 },
    })

    return NextResponse.json(genre, { status: 201 })
}
