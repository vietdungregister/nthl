import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

interface Props { params: Promise<{ id: string }> }

// GET /api/books/:id
export async function GET(_request: NextRequest, { params }: Props) {
    const { id } = await params
    const book = await prisma.book.findUnique({ where: { id } })
    if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(book)
}

// PUT /api/books/:id
export async function PUT(request: NextRequest, { params }: Props) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { title, slug, description, coverImage, buyUrl, publisher, year, order } = body

    const book = await prisma.book.update({
        where: { id },
        data: {
            ...(title !== undefined && { title }),
            ...(slug !== undefined && { slug }),
            ...(description !== undefined && { description }),
            ...(coverImage !== undefined && { coverImage }),
            ...(buyUrl !== undefined && { buyUrl }),
            ...(publisher !== undefined && { publisher }),
            ...(year !== undefined && { year }),
            ...(order !== undefined && { order }),
        },
    })

    return NextResponse.json(book)
}

// DELETE /api/books/:id
export async function DELETE(_request: NextRequest, { params }: Props) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await prisma.book.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
