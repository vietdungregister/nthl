import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

const MAX_LOGIN_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'Tài khoản', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const user = await prisma.adminUser.findUnique({
                    where: { email: credentials.email as string },
                })
                if (!user) return null

                // SEC-008: Account lockout check
                if (user.lockUntil && user.lockUntil > new Date()) {
                    const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000)
                    throw new Error(`Tài khoản bị khóa. Thử lại sau ${minutesLeft} phút.`)
                }

                const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash)

                if (!isValid) {
                    // Increment failed attempt counter
                    const newAttempts = user.loginAttempts + 1
                    const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS
                    await prisma.adminUser.update({
                        where: { id: user.id },
                        data: {
                            loginAttempts: newAttempts,
                            lockUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
                        },
                    })
                    return null
                }

                // Reset on successful login
                await prisma.adminUser.update({
                    where: { id: user.id },
                    data: {
                        lastLoginAt: new Date(),
                        loginAttempts: 0,
                        lockUntil: null,
                    },
                })

                return { id: user.id, email: user.email }
            },
        }),
    ],
    // SEC-009: Reduced from 30 days to 8 hours
    session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
    pages: { signIn: '/cms/login' },
    callbacks: {
        async jwt({ token, user }) {
            if (user) token.id = user.id
            return token
        },
        async session({ session, token }) {
            if (session.user) session.user.id = token.id as string
            return session
        },
    },
})
