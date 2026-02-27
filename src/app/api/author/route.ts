import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET() {
    const author = await prisma.authorProfile.findFirst()
    return NextResponse.json(author || {})
}

export async function PUT(request: Request) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await request.json()
    const author = await prisma.authorProfile.upsert({
        where: { id: 'singleton' },
        update: {
            name: data.name,
            bio: data.bio,
            bioShort: data.bioShort,
            avatarUrl: data.avatarUrl,
            coverImageUrl: data.coverImageUrl,
        },
        create: {
            id: 'singleton',
            name: data.name || 'Nguyễn Thế Hoàng Linh',
            bio: data.bio || '',
            bioShort: data.bioShort || '',
            avatarUrl: data.avatarUrl || '',
            coverImageUrl: data.coverImageUrl || '',
        },
    })
    return NextResponse.json(author)
}
