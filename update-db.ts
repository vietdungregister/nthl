import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    await prisma.authorProfile.update({
        where: { id: 'singleton' },
        data: { bioShort: '' }
    })
}
main().catch(console.error).finally(() => prisma.$disconnect())
