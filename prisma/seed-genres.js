const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const GENRES = [
    { value: 'poem', label: 'Thơ', emoji: '📝', order: 1 },
    { value: 'novel', label: 'Tiểu thuyết', emoji: '📖', order: 2 },
    { value: 'essay', label: 'Tiểu luận', emoji: '📄', order: 3 },
    { value: 'prose', label: 'Tùy bút', emoji: '✍️', order: 4 },
    { value: 'painting', label: 'Tranh', emoji: '🎨', order: 5 },
    { value: 'photo', label: 'Ảnh', emoji: '📷', order: 6 },
    { value: 'video', label: 'Video', emoji: '🎬', order: 7 },
]

async function main() {
    for (const g of GENRES) {
        await prisma.genre.upsert({
            where: { value: g.value },
            update: { label: g.label, emoji: g.emoji, order: g.order },
            create: g,
        })
        console.log(`Seeded genre: ${g.label}`)
    }
    console.log('Done seeding genres!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
