import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

interface Props { params: Promise<{ id: string }> }

// GET /api/genres/:id
export async function GET(_request: NextRequest, { params }: Props) {
    const { id } = await params
    const genre = await prisma.genre.findUnique({ where: { id } })
    if (!genre) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(genre)
}

// PUT /api/genres/:id
export async function PUT(request: NextRequest, { params }: Props) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { value, label, emoji, order, showInSidebar } = body

    const genre = await prisma.genre.update({
        where: { id },
        data: {
            ...(value !== undefined && { value }),
            ...(label !== undefined && { label }),
            ...(emoji !== undefined && { emoji }),
            ...(order !== undefined && { order }),
            ...(showInSidebar !== undefined && { showInSidebar }),
        },
    })

    return NextResponse.json(genre)
}

// DELETE /api/genres/:id
export async function DELETE(_request: NextRequest, { params }: Props) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await prisma.genre.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
