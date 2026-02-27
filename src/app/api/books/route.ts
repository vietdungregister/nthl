import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

// GET /api/books - List all books
export async function GET() {
    const books = await prisma.book.findMany({
        orderBy: [{ order: 'asc' }, { year: 'desc' }],
    })
    return NextResponse.json(books)
}

// POST /api/books - Create a new book
export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, slug, description, coverImage, buyUrl, publisher, year, order } = body

    if (!title || !slug) {
        return NextResponse.json({ error: 'Missing required fields (title, slug)' }, { status: 400 })
    }

    const existing = await prisma.book.findUnique({ where: { slug } })
    if (existing) return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })

    const book = await prisma.book.create({
        data: { title, slug, description, coverImage, buyUrl, publisher, year, order: order ?? 0 },
    })

    return NextResponse.json(book, { status: 201 })
}
