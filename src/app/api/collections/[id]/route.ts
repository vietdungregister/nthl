import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { title, slug, description, coverImage, order } = await request.json()
    if (!title || !slug) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const collection = await prisma.collection.update({
        where: { id },
        data: { title, slug, description, coverImage, order: order || 0 },
    })
    return NextResponse.json(collection)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await prisma.collection.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
