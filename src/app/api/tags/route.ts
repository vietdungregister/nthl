import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
    const tags = await prisma.tag.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { works: true } } },
    })
    return NextResponse.json(tags)
}

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, slug } = await request.json()
    if (!name || !slug) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const existing = await prisma.tag.findUnique({ where: { slug } })
    if (existing) return NextResponse.json({ error: 'Slug exists' }, { status: 400 })

    const tag = await prisma.tag.create({ data: { name, slug } })
    return NextResponse.json(tag, { status: 201 })
}
