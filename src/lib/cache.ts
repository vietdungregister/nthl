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
