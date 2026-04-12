import slugifyLib from 'slugify'

export function slugify(text: string): string {
    // Vietnamese-aware slugify
    return slugifyLib(text, {
        lower: true,
        strict: true,
        locale: 'vi',
    })
}

export function formatDate(date: Date | string): string {
    const d = new Date(date)
    return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

export function truncate(str: string, length: number): string {
    if (str.length <= length) return str
    return str.slice(0, length).trim() + '...'
}

export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ')
}

export const GENRES = [
    { value: 'stt', label: 'Stt', emoji: '📄' },
    { value: 'poem', label: 'Thơ', emoji: '📝' },
    { value: 'short_story', label: 'Truyện ngắn', emoji: '📖' },
    { value: 'essay', label: 'Tản văn', emoji: '✍️' },
    { value: 'novel', label: 'Tiểu thuyết', emoji: '📚' },
    { value: 'memoir', label: 'Bút ký', emoji: '🖊️' },
    { value: 'children', label: 'Thơ thiếu nhi', emoji: '🧒' },
    { value: 'photo', label: 'Ảnh', emoji: '📷' },
    { value: 'video', label: 'Video', emoji: '🎬' },
] as const

export type Genre = (typeof GENRES)[number]['value']

// 3 special genres: always hardcoded, always present
export const VISUAL_GENRES = ['photo', 'video'] as const
export const SPECIAL_GENRES = ['photo', 'video'] as const

export function isMediaGenre(genre: string): boolean {
    return genre === 'photo' || genre === 'video'
}

export const STATUSES = [
    { value: 'draft', label: 'Bản nháp', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'published', label: 'Đã xuất bản', color: 'bg-green-100 text-green-800' },
    { value: 'scheduled', label: 'Hẹn giờ', color: 'bg-blue-100 text-blue-800' },
] as const

export function getGenreLabel(genre: string): string {
    return GENRES.find((g) => g.value === genre)?.label ?? genre
}

export function getGenreEmoji(genre: string): string {
    return GENRES.find((g) => g.value === genre)?.emoji ?? '📝'
}

export function getStatusInfo(status: string) {
    return STATUSES.find((s) => s.value === status) ?? STATUSES[0]
}

/**
 * Fix Vietnamese syllables bị tách bởi space do crawl.
 *
 * Các pattern:
 *  "s ống"   → "sống"   (phụ âm đầu từ + space + phần có dấu)
 *  "b ạn"    → "bạn"
 *  "l ạnh"   → "lạnh"
 *  "đ ến"    → "đến"
 *  "CHUYỆ N" → "CHUYỆN" (nguyên âm có dấu + space + 1-2 ký tự cuối)
 *  "CỦ A"    → "CỦA"
 */
export function fixSplitVietnamese(text: string): string {
  const VN = 'àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ'

  let r = text
  for (let i = 0; i < 5; i++) {
    const prev = r

    // P1: phụ âm đơn/đôi ở ĐẦU TỪ (sau space hoặc đầu chuỗi) + space + phần mang dấu
    // Ex: "s ống", "b ạn", "l ạnh", "đ ến", "ph ải", "tr ời"
    r = r.replace(
      new RegExp(`((?:^|(?<= ))[bcdfghjklmnpqrstvwxyz\u0111]{1,2}) ([${VN}][a-z${VN}]{0,3})(?= |\\.|,|!|\\?|\\n|$)`, 'gmu'),
      '$1$2'
    )

    // P2: nguyên âm có dấu UPPERCASE + space + 1-2 ký tự cuối (lỗi trong chuỗi ALL-CAPS)
    // Ex: "CHUYỆ N", "CỦ A", "THỰ C" — KHÔNG match lowercase ("có là" giữ nguyên)
    r = r.replace(
      new RegExp(`([ÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]) ([A-Z${VN}]{1,2})(?= |\\.|,|!|\\?|\\n|$)`, 'gmu'),
      '$1$2'
    )

    // P3: lowercase + space + single char (lỗi crawl phổ biến)
    // Ex: "n gười", "c ủa"
    r = r.replace(
      new RegExp(`([a-z]) ([a-z])(?= |\\.|,|!|\\?|\\n|$)`, 'gmu'),
      '$1$2'
    )

    if (r === prev) break
  }
  return r
}




/** Chuẩn hoá title: thay newline + tab bằng space, collapse multiple spaces,
 * chèn space giữa [lowercase][Uppercase] do crawl ghép không có space,
 * và fix Vietnamese syllables bị tách.
 */
export function cleanTitle(t: string | null | undefined): string {
  if (!t) return ''
  const fixed = fixSplitVietnamese(
    t.replace(/[\n\r\t]+/g, ' ')
     .replace(/([a-z\u00C0-\u024F\u1E00-\u1EFF])([A-Z\u00C0-\u00D6\u00D8-\u00DE\u0100-\u0136\u0139-\u0148\u014A-\u0178\u1EA0-\u1EF9])/g, '$1 $2')
     .replace(/  +/g, ' ')
     .trim()
  )
  return fixed.replace(/  +/g, ' ').trim()
}

/** Tên tác giả hay xuất hiện ở đầu excerpt từ FB/forum import */
const AUTHOR_PREFIXES = [
    'Nguyễn Thế Hoàng Linh', 'NGUYỄN THẾ HOÀNG LINH',
    'nguyenthehoanglinh', 'away',
]

/** Clean excerpt: bỏ tên tác giả ở đầu */
export function cleanExcerpt(text: string | null | undefined): string {
    if (!text) return ''
    let t = text.trim()
    for (const prefix of AUTHOR_PREFIXES) {
        if (t.toLowerCase().startsWith(prefix.toLowerCase())) {
            t = t.slice(prefix.length).replace(/^[\s\n.,;:–—-]+/, '').trim()
        }
    }
    return t
}

/**
 * Làm sạch nội dung crawl: bỏ indent thừa, collapse nhiều dòng trống liên tiếp,
 * collapse nhiều space thành 1 nhưng GIỮ line breaks (quan trọng với thơ).
 * Fix Vietnamese syllables bị tách + chèn space giữa camelCase liền nhau.
 */
export function cleanContent(text: string | null | undefined): string {
    if (!text) return ''
    const step1 = text
        // Bỏ leading whitespace (tab/space) ở đầu mỗi dòng
        .replace(/^[ \t]+/gm, '')
        // Collapse nhiều space trên cùng 1 dòng thành 1
        .replace(/[ \t]{2,}/g, ' ')
        // Collapse 3+ newlines liên tiếp → tối đa 2 (giữ paragraph break)
        .replace(/\n{3,}/g, '\n\n')
        // detect lowercase→Uppercase liền nhau (crawled content ghép dòng thiếu space)
        .replace(/([a-z\u00C0-\u024F\u1E00-\u1EFF])([A-Z\u00C0-\u00D6\u00D8-\u00DE\u0100-\u0136\u0139-\u0148\u014A-\u0178\u1EA0-\u1EF9])/g, '$1 $2')
        .trim()
    // Apply Vietnamese split fix line by line (để không phá line breaks của thơ)
    return step1.split('\n').map(line => fixSplitVietnamese(line)).join('\n')
}
