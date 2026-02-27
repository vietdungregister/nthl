import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

// GET /api/works/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const work = await prisma.work.findUnique({
        where: { id, deletedAt: null },
        include: {
            tags: { include: { tag: true } },
            collections: { include: { collection: true } },
        },
    })

    if (!work) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(work)
}

// PUT /api/works/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { title, slug, genre, content, excerpt, coverImageUrl, status, publishedAt, scheduledAt, isFeatured, featuredDate, seoTitle, seoDescription, ogImageUrl, tagIds, collectionIds } = body

    // Check slug uniqueness (excluding current work)
    if (slug) {
        const existing = await prisma.work.findFirst({ where: { slug, id: { not: id } } })
        if (existing) return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
    }

    // Remove existing tags and collections if new ones provided
    if (tagIds !== undefined) {
        await prisma.workTag.deleteMany({ where: { workId: id } })
    }
    if (collectionIds !== undefined) {
        await prisma.workCollection.deleteMany({ where: { workId: id } })
    }

    const work = await prisma.work.update({
        where: { id },
        data: {
            ...(title !== undefined && { title }),
            ...(slug !== undefined && { slug }),
            ...(genre !== undefined && { genre }),
            ...(content !== undefined && { content }),
            ...(excerpt !== undefined && { excerpt }),
            ...(coverImageUrl !== undefined && { coverImageUrl }),
            ...(status !== undefined && { status }),
            ...(status === 'published' && { publishedAt: publishedAt ? new Date(publishedAt) : new Date() }),
            ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
            ...(isFeatured !== undefined && { isFeatured }),
            ...(featuredDate !== undefined && { featuredDate: featuredDate ? new Date(featuredDate) : null }),
            ...(seoTitle !== undefined && { seoTitle }),
            ...(seoDescription !== undefined && { seoDescription }),
            ...(ogImageUrl !== undefined && { ogImageUrl }),
            ...(tagIds && { tags: { create: tagIds.map((tid: string) => ({ tagId: tid })) } }),
            ...(collectionIds && { collections: { create: collectionIds.map((cid: string) => ({ collectionId: cid })) } }),
        },
        include: { tags: { include: { tag: true } }, collections: { include: { collection: true } } },
    })

    return NextResponse.json(work)
}

// DELETE /api/works/[id] - Soft delete
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await prisma.work.update({
        where: { id },
        data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
}
