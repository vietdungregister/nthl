/**
 * Centralized cache utility dùng Next.js unstable_cache.
 *
 * Data ít thay đổi (genres, tags, authorProfile) được cache server-side
 * để tránh query DB lặp lại trên mỗi request. Revalidate theo tag khi admin
 * thực hiện thay đổi qua CMS (gọi revalidateTag() trong API routes).
 *
 * TTL mặc định: 1 giờ (3600s). Có thể trigger revalidate sớm qua tag.
 */
import { unstable_cache } from 'next/cache'
import { prisma } from './db'

/** Danh sách thể loại — thay đổi rất hiếm */
export const getCachedGenres = unstable_cache(
  () => prisma.genre.findMany({ orderBy: { order: 'asc' } }),
  ['genres'],
  { revalidate: 3600, tags: ['genres'] }
)

/** Tất cả tags — thay đổi khi admin thêm/xóa tag */
export const getCachedTags = unstable_cache(
  () => prisma.tag.findMany({ orderBy: { name: 'asc' } }),
  ['tags'],
  { revalidate: 3600, tags: ['tags'] }
)

/** Thông tin tác giả — thay đổi rất hiếm */
export const getCachedAuthorProfile = unstable_cache(
  () => prisma.authorProfile.findFirst(),
  ['author-profile'],
  { revalidate: 86400, tags: ['author-profile'] } // 24h
)

/** Số lượng tác phẩm theo thể loại — dùng cho sidebar */
export const getCachedGenreCounts = unstable_cache(
  async () => {
    const counts = await prisma.work.groupBy({
      by: ['genre'],
      where: { status: 'published', deletedAt: null },
      _count: { _all: true },
    })
    return counts.map(c => ({ genre: c.genre, _count: c._count._all }))
  },
  ['genre-counts'],
  { revalidate: 300, tags: ['genre-counts'] } // 5 phút
)

/** Danh sách sách — thay đổi rất hiếm */
export const getCachedBooks = unstable_cache(
  () => prisma.book.findMany({
    orderBy: [{ order: 'asc' }, { year: 'desc' }],
    select: { id: true, slug: true, title: true, publisher: true, year: true, coverImage: true },
  }),
  ['books'],
  { revalidate: 3600, tags: ['books'] } // 1h
)

/** Danh sách bộ sưu tập — thay đổi rất hiếm */
export const getCachedCollections = unstable_cache(
  () => prisma.collection.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { works: true } } },
  }),
  ['collections'],
  { revalidate: 3600, tags: ['collections'] } // 1h
)
