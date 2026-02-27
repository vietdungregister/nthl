import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await prisma.media.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
