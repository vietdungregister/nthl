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
    { value: 'poem', label: 'Thơ', emoji: '📝' },
    { value: 'novel', label: 'Tiểu thuyết', emoji: '📖' },
    { value: 'essay', label: 'Tiểu luận', emoji: '📄' },
    { value: 'prose', label: 'Tùy bút', emoji: '✍️' },
    { value: 'painting', label: 'Tranh', emoji: '🎨' },
    { value: 'photo', label: 'Ảnh', emoji: '📷' },
    { value: 'video', label: 'Video', emoji: '🎬' },
] as const

export type Genre = (typeof GENRES)[number]['value']

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
