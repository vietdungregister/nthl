import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ---- Rate Limiter (5 comments per IP per hour) --------------------------
const COMMENT_WINDOW_MS = 60 * 60 * 1000
const COMMENT_MAX_PER_IP = 5
interface RateEntry { count: number; resetAt: number }
const commentIpMap = new Map<string, RateEntry>()

function checkCommentRateLimit(ip: string): boolean {
    const now = Date.now()
    const entry = commentIpMap.get(ip)
    if (!entry || now > entry.resetAt) {
        commentIpMap.set(ip, { count: 1, resetAt: now + COMMENT_WINDOW_MS })
        return true
    }
    if (entry.count >= COMMENT_MAX_PER_IP) return false
    entry.count++
    return true
}

// Strip HTML tags to prevent stored XSS
function stripHtml(str: string): string {
    return str.replace(/<[^>]*>/g, '').trim()
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const workId = searchParams.get('workId')
    if (!workId || typeof workId !== 'string' || workId.length > 36) {
        return NextResponse.json({ error: 'workId required' }, { status: 400 })
    }

    const comments = await prisma.comment.findMany({
        where: { workId },
        orderBy: { createdAt: 'desc' },
        take: 100, // cap results
    })
    return NextResponse.json(comments)
}

export async function POST(request: NextRequest) {
    // Rate limit by IP
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1'
    if (!checkCommentRateLimit(ip)) {
        return NextResponse.json(
            { error: 'Bạn đã bình luận quá nhiều lần. Thử lại sau 1 giờ nhé.' },
            { status: 429 }
        )
    }

    let data: Record<string, unknown>
    try {
        data = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { workId, content, name } = data

    // Validate
    if (!workId || typeof workId !== 'string' || workId.length > 36) {
        return NextResponse.json({ error: 'workId không hợp lệ' }, { status: 400 })
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
        return NextResponse.json({ error: 'Nội dung bình luận không được để trống' }, { status: 400 })
    }
    if (content.length > 2000) {
        return NextResponse.json({ error: 'Bình luận tối đa 2000 ký tự' }, { status: 400 })
    }
    if (name && typeof name === 'string' && name.length > 100) {
        return NextResponse.json({ error: 'Tên tối đa 100 ký tự' }, { status: 400 })
    }

    // Strip HTML from all user input
    const safeContent = stripHtml(content)
    const safeName = typeof name === 'string' ? stripHtml(name) || 'Ẩn danh' : 'Ẩn danh'

    if (!safeContent) {
        return NextResponse.json({ error: 'Nội dung bình luận không hợp lệ' }, { status: 400 })
    }

    const comment = await prisma.comment.create({
        data: {
            workId,
            name: safeName,
            content: safeContent,
        },
    })
    return NextResponse.json(comment)
}

