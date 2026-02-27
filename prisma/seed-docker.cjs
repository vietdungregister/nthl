// seed-docker.cjs — Dùng khi seed trong Docker container (dùng @prisma/client chuẩn)
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const prisma = new PrismaClient()

async function main() {
    const email = process.env.ADMIN_EMAIL || 'admin@nguyenthehoanglinh.vn'
    const password = process.env.ADMIN_PASSWORD || 'admin123456'
    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.adminUser.upsert({
        where: { email },
        update: { passwordHash },
        create: { email, passwordHash },
    })
    console.log('✅ Admin user:', email)

    await prisma.authorProfile.upsert({
        where: { id: 'singleton' },
        update: {},
        create: {
            id: 'singleton',
            name: 'Nguyễn Thế Hoàng Linh',
            bioShort: 'Nhà thơ, nhà văn — "Thi tài tuổi 20"',
            bio: 'Nguyễn Thế Hoàng Linh (sinh năm 1982 tại Hà Nội) là nhà thơ, nhà văn Việt Nam được giới phê bình mệnh danh là "Thi tài tuổi 20".',
            socialLinks: JSON.stringify({ facebook: 'https://www.facebook.com/nguyenthehoanglinh' }),
            awards: JSON.stringify([
                { title: 'Giải thưởng Hội Nhà văn Hà Nội', year: 2004, description: 'Tiểu thuyết "Chuyện của thiên tài"' },
                { title: 'Tác phẩm vào SGK lớp 6', year: 2021, description: 'Bài thơ "Bắt nạt"' },
            ]),
            publications: JSON.stringify([
                { title: 'Lẽ giản đơn', year: 2006 }, { title: 'Mật thư', year: 2012 },
                { title: 'Em giấu gì ở trong lòng thế', year: 2013 },
                { title: 'Ra vườn nhặt nắng', year: 2015 }, { title: 'Chuyện của thiên tài', year: 2004 },
            ]),
        },
    })
    console.log('✅ Author profile created')

    const tags = ['Tình yêu', 'Cuộc sống', 'Thiếu nhi', 'Triết lý', 'Thiên nhiên', 'Nỗi buồn', 'Hạnh phúc', 'Gia đình', 'Tuổi trẻ', 'Cô đơn']
    for (const name of tags) {
        const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '-')
        await prisma.tag.upsert({ where: { slug }, update: {}, create: { name, slug } })
    }
    console.log('✅ Tags created')

    const cols = [
        { title: 'Ra vườn nhặt nắng', description: 'Tập thơ thiếu nhi, 2015' },
        { title: 'Em giấu gì ở trong lòng thế', description: 'Thơ tình, 2013' },
        { title: 'Mật thư', description: 'Tập thơ 2012' },
        { title: 'Chuyện của thiên tài', description: 'Tiểu thuyết đoạt giải 2004' },
    ]
    for (let i = 0; i < cols.length; i++) {
        const slug = cols[i].title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '-')
        await prisma.collection.upsert({ where: { slug }, update: {}, create: { title: cols[i].title, slug, description: cols[i].description, order: i } })
    }
    console.log('✅ Collections created')

    const works = [
        { title: 'Bắt nạt', genre: 'poem', featured: true, content: 'Bắt nạt là xấu lắm\nĐừng bắt nạt bạn ơi\nBất cứ ai trên đời\nĐều không cần bắt nạt', excerpt: 'Bắt nạt là xấu lắm / Đừng bắt nạt bạn ơi...', tagSlugs: ['thieu-nhi', 'cuoc-song'], colSlugs: ['ra-vuon-nhat-nang'] },
        { title: 'Ra vườn nhặt nắng', genre: 'poem', featured: true, content: 'Ông mặc áo nâu\nRa vườn nhặt nắng\nÔng nhặt nhặt hoài\nNắng rơi đầy lối', excerpt: 'Ông mặc áo nâu / Ra vườn nhặt nắng...', tagSlugs: ['thieu-nhi', 'gia-dinh'], colSlugs: ['ra-vuon-nhat-nang'] },
        { title: 'Lẽ giản đơn', genre: 'poem', featured: true, content: 'Cái gì cũng từ\ncái giản đơn nhất\nmà nên\n\nTình yêu\ntừ một cái nhìn', excerpt: 'Cái gì cũng từ / cái giản đơn nhất / mà nên...', tagSlugs: ['triet-ly', 'hanh-phuc'], colSlugs: [] },
    ]

    for (const w of works) {
        const slug = w.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '-')
        const exists = await prisma.work.findUnique({ where: { slug } })
        if (!exists) {
            const tagIds = []
            for (const ts of w.tagSlugs) { const t = await prisma.tag.findUnique({ where: { slug: ts } }); if (t) tagIds.push({ tagId: t.id }) }
            const colIds = []
            for (const cs of w.colSlugs) { const c = await prisma.collection.findUnique({ where: { slug: cs } }); if (c) colIds.push({ collectionId: c.id }) }
            await prisma.work.create({ data: { title: w.title, slug, genre: w.genre, content: w.content, excerpt: w.excerpt, status: 'published', isFeatured: w.featured, publishedAt: new Date(), tags: { create: tagIds }, collections: { create: colIds } } })
        }
    }
    console.log('✅ Sample works created')
    console.log('🎉 Seed hoàn tất!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
