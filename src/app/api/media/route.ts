import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// ---- File Upload Security Config ----------------------------------------
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
])
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.ogg', '.mov'])
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export async function GET() {
    const media = await prisma.media.findMany({
        orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(media)
}

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    // Validate file size
    if (file.size === 0) return NextResponse.json({ error: 'File rỗng.' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File quá lớn. Tối đa 100MB.' }, { status: 400 })
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
            { error: `Loại file không được phép: ${file.type}. Chỉ chấp nhận ảnh và video.` },
            { status: 400 }
        )
    }

    // Validate file extension
    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
            { error: `Phần mở rộng không được phép: ${ext}` },
            { status: 400 }
        )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    // Sanitize filename: keep only safe characters + preserve extension
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueName = `${Date.now()}-${baseName}${ext}`
    const filePath = path.join(uploadDir, uniqueName)
    await writeFile(filePath, buffer)

    const url = `/uploads/${uniqueName}`
    const type = file.type.startsWith('image/') ? 'image' : 'video'

    const media = await prisma.media.create({
        data: {
            filename: file.name,
            url,
            type,
            size: file.size,
            altText: formData.get('altText') as string || '',
        },
    })

    return NextResponse.json(media, { status: 201 })
}
