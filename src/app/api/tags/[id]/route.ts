import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { name, slug } = await request.json()
    if (!name || !slug) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const tag = await prisma.tag.update({ where: { id }, data: { name, slug } })
    return NextResponse.json(tag)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await prisma.tag.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
