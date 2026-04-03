import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { chunkAndEmbed } from '@/lib/chunkAndEmbed'

// GET /api/works - List works (with filters, search, pagination)
export async function GET(request: NextRequest) {
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const genre = searchParams.get('genre')
    const search = searchParams.get('search')
    const tagSlug = searchParams.get('tag')          // filter by tag slug
    const dateFrom = searchParams.get('dateFrom')    // createdAt range from
    const dateTo = searchParams.get('dateTo')        // createdAt range to
    const writtenFrom = searchParams.get('writtenFrom') // writtenAt range from
    const writtenTo = searchParams.get('writtenTo')     // writtenAt range to
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    // SEC-016: cap limit to prevent full-table dumps
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 100)
    const sort = searchParams.get('sort') || 'newest'

    const where: Record<string, unknown> = { deletedAt: null }

    // SEC-005: Unauthenticated users can only see published works
    if (!session) {
        where.status = 'published'
    } else if (status) {
        where.status = status
    }

    if (genre) where.genre = genre

    if (search) {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
            { excerpt: { contains: search, mode: 'insensitive' } },
        ]
    }

    // Filter by tag slug — join through WorkTag → Tag
    if (tagSlug) {
        where.tags = { some: { tag: { slug: tagSlug } } }
    }

    // Filter by date range on createdAt
    if (dateFrom || dateTo) {
        const createdAt: Record<string, Date> = {}
        if (dateFrom) createdAt.gte = new Date(dateFrom)
        if (dateTo) {
            const end = new Date(dateTo)
            end.setHours(23, 59, 59, 999)
            createdAt.lte = end
        }
        where.createdAt = createdAt
    }

    // Filter by date range on writtenAt
    if (writtenFrom || writtenTo) {
        const writtenAt: Record<string, Date> = {}
        if (writtenFrom) writtenAt.gte = new Date(writtenFrom)
        if (writtenTo) {
            const end = new Date(writtenTo)
            end.setHours(23, 59, 59, 999)
            writtenAt.lte = end
        }
        where.writtenAt = writtenAt
    }

    const orderBy = (() => {
        switch (sort) {
            case 'oldest':       return { createdAt: 'asc' as const }
            case 'title':        return { title: 'asc' as const }
            case 'title_desc':   return { title: 'desc' as const }
            case 'views':        return { viewCount: 'desc' as const }
            case 'writtenAt_desc': return { writtenAt: 'desc' as const }
            case 'writtenAt_asc':  return { writtenAt: 'asc' as const }
            default:             return { createdAt: 'desc' as const }
        }
    })()

    const [works, total] = await Promise.all([
        prisma.work.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            // select thay vì include — KHÔNG load content (vài trăm KB/work)
            select: {
                id: true, title: true, slug: true, genre: true,
                status: true, excerpt: true, coverImageUrl: true,
                isFeatured: true, viewCount: true,
                createdAt: true, publishedAt: true, writtenAt: true,
                tags: { include: { tag: true } },
                collections: { include: { collection: true } },
            },
        }),
        prisma.work.count({ where }),
    ])

    return NextResponse.json({
        works,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
}

// POST /api/works - Create new work
export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, slug, genre, content, excerpt, coverImageUrl, status, publishedAt, scheduledAt, isFeatured, featuredDate, writtenAt, translations, seoTitle, seoDescription, ogImageUrl, tagIds, collectionIds } = body

    const isMediaGenre = genre === 'photo' || genre === 'video'
    if (!slug || !genre) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!isMediaGenre && !title) {
        return NextResponse.json({ error: 'Tiêu đề là bắt buộc' }, { status: 400 })
    }
    const finalTitle = title || `${genre === 'video' ? 'Video' : 'Ảnh'} — ${new Date().toLocaleDateString('vi-VN')}`

    // Check slug uniqueness
    const existing = await prisma.work.findUnique({ where: { slug } })
    if (existing) return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })

    const work = await prisma.work.create({
        data: {
            title: finalTitle, slug, genre, content, excerpt, coverImageUrl,
            status: status || 'draft',
            publishedAt: status === 'published' ? (publishedAt ? new Date(publishedAt) : new Date()) : null,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            isFeatured: isFeatured || false,
            featuredDate: featuredDate ? new Date(featuredDate) : null,
            writtenAt: writtenAt ? new Date(writtenAt) : null,
            translations: translations || null,
            seoTitle, seoDescription, ogImageUrl,
            tags: tagIds?.length ? { create: tagIds.map((id: string) => ({ tagId: id })) } : undefined,
            collections: collectionIds?.length ? { create: collectionIds.map((id: string) => ({ collectionId: id })) } : undefined,
        },
        include: { tags: { include: { tag: true } }, collections: { include: { collection: true } } },
    })

    // Auto-index: tạo chunks + embeddings sau khi response trả về user
    if (content) {
        after(() => chunkAndEmbed(work.id, content))
    }

    return NextResponse.json(work, { status: 201 })
}
