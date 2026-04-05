import { PrismaClient } from '@prisma/client'
import fs from 'fs'
const prisma = new PrismaClient()
async function main() {
    const profile = await prisma.authorProfile.findFirst()
    fs.writeFileSync('profile.json', JSON.stringify(profile, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
