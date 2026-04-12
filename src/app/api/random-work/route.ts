import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cleanTitle, fixSplitVietnamese } from '@/lib/utils'

// Không cache API này — mỗi request cần bài ngẫu nhiên khác nhau
export const dynamic = 'force-dynamic'

const TEXT_GENRES = ['poem', 'essay', 'short_story', 'memoir', 'stt']

/** Strip title từ đầu content nếu content bắt đầu bằng title */
function stripTitle(content: string, title: string): string {
  const normalized = content.trimStart()
  if (normalized.toLowerCase().startsWith(title.toLowerCase())) {
    return normalized.slice(title.length).replace(/^[\s\n]+/, '')
  }
  return normalized
}

export async function GET(request: Request) {
  try {
    // Lấy excludeId từ query params để tránh trùng bài
    const { searchParams } = new URL(request.url)
    const excludeId = searchParams.get('excludeId')

    // Count để random offset — tránh ORDER BY RANDOM() trên table lớn
    const count = await prisma.work.count({
      where: {
        status: 'published',
        deletedAt: null,
        genre: { in: TEXT_GENRES },
        content: { not: '' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })

    if (count === 0) {
      return NextResponse.json({ error: 'No works found' }, { status: 404 })
    }

    const skip = Math.floor(Math.random() * count)

    const work = await prisma.work.findFirst({
      where: {
        status: 'published',
        deletedAt: null,
        genre: { in: TEXT_GENRES },
        content: { not: '' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        genre: true,
        content: true,
        writtenAt: true,
      },
      skip,
    })

    if (!work) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Clean content — fix split Vietnamese syllables from crawled data
    const cleanContent = stripTitle(work.content, work.title)
      .split('\n').map(l => fixSplitVietnamese(l)).join('\n')

    // Đếm số dòng không rỗng (thơ)
    const lines = cleanContent.split('\n').map(l => l.trim()).filter(Boolean)
    const lineCount = lines.length

    // Genre label mapping
    const genreLabels: Record<string, string> = {
      poem: 'Thơ',
      essay: 'Tản văn',
      short_story: 'Truyện ngắn',
      memoir: 'Hồi ký',
      stt: 'Status',
    }

    return NextResponse.json({
      id: work.id,
      title: cleanTitle(work.title),
      slug: work.slug,
      genre: work.genre,
      genreLabel: genreLabels[work.genre] ?? work.genre,
      content: cleanContent,
      lineCount,
      writtenAt: work.writtenAt?.toISOString().slice(0, 10) ?? null,
    })
  } catch (error) {
    console.error('[random-work]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
