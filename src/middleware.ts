import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Protect CMS routes (except login)
    if (pathname.startsWith('/cms') && !pathname.startsWith('/cms/login')) {
        const session = await auth()
        if (!session) {
            const loginUrl = new URL('/cms/login', request.url)
            loginUrl.searchParams.set('callbackUrl', pathname)
            return NextResponse.redirect(loginUrl)
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/cms/:path*'],
}
