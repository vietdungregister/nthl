const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function main() {
    const prisma = new PrismaClient()

    // Check current user
    const user = await prisma.adminUser.findFirst()
    console.log('Current user:', JSON.stringify(user, null, 2))

    if (user) {
        const match = await bcrypt.compare('112345678', user.passwordHash)
        console.log('Password match:', match)
    }

    // Reset: delete all, create fresh with no lockout
    await prisma.adminUser.deleteMany({})
    const hash = await bcrypt.hash('112345678', 12)
    const newUser = await prisma.adminUser.create({
        data: {
            email: 'admin@admin.com',
            passwordHash: hash,
            loginAttempts: 0,
            lockUntil: null,
        }
    })
    console.log('Created fresh admin:', newUser.email)

    await prisma.$disconnect()
}

main()
