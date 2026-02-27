import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
    const collections = await prisma.collection.findMany({
        orderBy: { order: 'asc' },
        include: { _count: { select: { works: true } } },
    })
    return NextResponse.json(collections)
}

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { title, slug, description, coverImage, order } = await request.json()
    if (!title || !slug) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const existing = await prisma.collection.findUnique({ where: { slug } })
    if (existing) return NextResponse.json({ error: 'Slug exists' }, { status: 400 })

    const collection = await prisma.collection.create({
        data: { title, slug, description, coverImage, order: order || 0 },
    })
    return NextResponse.json(collection, { status: 201 })
}
