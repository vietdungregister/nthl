import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// Fallback static file server for /uploads/* in Docker standalone mode.
// Next.js standalone server does not automatically serve the public/ directory,
// so this route handler reads files from public/uploads/ and serves them directly.

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

const MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path: pathParts } = await params

    // Sanitize: join parts and resolve to prevent path traversal
    const filename = pathParts.join('/')
    const resolved = path.resolve(UPLOADS_DIR, filename)

    // Security: ensure the resolved path is inside UPLOADS_DIR
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) && resolved !== UPLOADS_DIR) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    if (!existsSync(resolved)) {
        return new NextResponse('Not Found', { status: 404 })
    }

    const ext = path.extname(resolved).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    const buffer = await readFile(resolved)

    return new NextResponse(buffer, {
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    })
}
