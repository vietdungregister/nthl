// Script to update admin password hash in SQLite database
// Run with: npx ts-node update-admin-password.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const newPassword = process.env.ADMIN_PASSWORD
    if (!newPassword) {
        console.error('❌ ADMIN_PASSWORD environment variable not set!')
        process.exit(1)
    }

    const hash = await bcrypt.hash(newPassword, 12)

    const result = await prisma.adminUser.updateMany({
        data: { passwordHash: hash }
    })

    console.log(`✅ Updated password hash for ${result.count} admin user(s).`)
}

main()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); process.exit(1) })
