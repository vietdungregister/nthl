import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

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
    console.log('✅ Admin user created:', email)

    await prisma.authorProfile.upsert({
        where: { id: 'singleton' },
        update: {},
        create: {
            id: 'singleton',
            name: 'Nguyễn Thế Hoàng Linh',
            bioShort: 'Nhà thơ, nhà văn — "Thi tài tuổi 20"',
            bio: 'Nguyễn Thế Hoàng Linh (sinh năm 1982 tại Hà Nội) là nhà thơ, nhà văn Việt Nam được giới phê bình mệnh danh là "Thi tài tuổi 20".\n\nNăm 2004, tiểu thuyết "Chuyện của thiên tài" đoạt Giải thưởng Hội Nhà văn Hà Nội.\n\nPhong cách thơ giản dị đến mức cổ điển, đôi khi đùa cợt nhưng chứa đựng triết lý sâu sắc.',
            socialLinks: JSON.stringify({ facebook: 'https://www.facebook.com/nguyenthehoanglinh' }),
            awards: JSON.stringify([
                { title: 'Giải thưởng Hội Nhà văn Hà Nội', year: 2004, description: 'Tiểu thuyết "Chuyện của thiên tài"' },
                { title: 'Tác phẩm vào SGK lớp 6', year: 2021, description: 'Bài thơ "Bắt nạt"' },
            ]),
            publications: JSON.stringify([
                { title: 'Mầm sống' }, { title: 'Uống một ngụm nước biển' },
                { title: 'Lẽ giản đơn', year: 2006 }, { title: 'Hở', year: 2011 },
                { title: 'Mật thư', year: 2012 }, { title: 'Em giấu gì ở trong lòng thế', year: 2013 },
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
        { title: 'Em giấu gì ở trong lòng thế', description: 'Thơ tình chép tay, 2013' },
        { title: 'Mật thư', description: 'Tập thơ 2012' },
        { title: 'Chuyện của thiên tài', description: 'Tiểu thuyết đoạt giải 2004' },
    ]
    for (let i = 0; i < cols.length; i++) {
        const slug = cols[i].title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '-')
        await prisma.collection.upsert({ where: { slug }, update: {}, create: { title: cols[i].title, slug, description: cols[i].description, order: i } })
    }
    console.log('✅ Collections created')

    const works = [
        { title: 'Bắt nạt', genre: 'poem', featured: true, content: 'Bắt nạt là xấu lắm\nĐừng bắt nạt bạn ơi\nBất cứ ai trên đời\nĐều không cần bắt nạt\n\nSao không thử giật nắng\nBắt mưa bắt gió đi\nSao không vật tay xem\nAi cổ tay khỏe hơn\n\nĐừng bắt nạt bạn nào\nDù là ai đi nữa\nĐừng bắt nạt cây hoa\nĐừng bắt nạt tiếng Việt', excerpt: 'Bắt nạt là xấu lắm / Đừng bắt nạt bạn ơi...', tagSlugs: ['thieu-nhi', 'cuoc-song'], colSlugs: ['ra-vuon-nhat-nang'] },
        { title: 'Ra vườn nhặt nắng', genre: 'poem', featured: true, content: 'Ông mặc áo nâu\nRa vườn nhặt nắng\nÔng nhặt nhặt hoài\nNắng rơi đầy lối\n\nBà xách rổ ra\nNhặt nắng cùng ông\nNắng bay vào rổ\nVàng ươm vàng ươm\n\nCháu chạy ra vườn\nCháu cuộn trong nắng\nÔng bà nhìn cháu\nCười hiền cười hiền', excerpt: 'Ông mặc áo nâu / Ra vườn nhặt nắng...', tagSlugs: ['thieu-nhi', 'gia-dinh'], colSlugs: ['ra-vuon-nhat-nang'] },
        { title: 'Giá mà được chết đi một lúc', genre: 'poem', featured: true, content: 'Giá mà được chết đi một lúc\nrồi sống lại\nthì tốt\n\nChết đi cho bớt mệt\nsống lại cho bớt nhớ\n\nChết đi thì yên ổn\nsống lại thì vui thôi', excerpt: 'Giá mà được chết đi một lúc...', tagSlugs: ['triet-ly', 'noi-buon'], colSlugs: [] },
        { title: 'Lẽ giản đơn', genre: 'poem', featured: true, content: 'Cái gì cũng từ\ncái giản đơn nhất\nmà nên\n\nTình yêu\ntừ một cái nhìn\nMùa xuân\ntừ một cành xanh\n\nCòn hạnh phúc\ntừ khi biết mình\nđang hạnh phúc', excerpt: 'Cái gì cũng từ cái giản đơn nhất mà nên...', tagSlugs: ['triet-ly', 'hanh-phuc'], colSlugs: [] },
        { title: 'Cảm ơn', genre: 'poem', featured: false, content: 'Cảm ơn bạn\nvì đã là bạn\nchứ không phải ai khác\n\nCảm ơn tôi\nvì đã là tôi\nchứ không phải ai khác', excerpt: 'Cảm ơn bạn / vì đã là bạn...', tagSlugs: ['hanh-phuc', 'cuoc-song'], colSlugs: [] },
    ]

    for (const w of works) {
        const slug = w.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '-')
        const exists = await prisma.work.findUnique({ where: { slug } })
        if (!exists) {
            const tagIds: { tagId: string }[] = []
            for (const ts of w.tagSlugs) { const t = await prisma.tag.findUnique({ where: { slug: ts } }); if (t) tagIds.push({ tagId: t.id }) }
            const colIds: { collectionId: string }[] = []
            for (const cs of w.colSlugs) { const c = await prisma.collection.findUnique({ where: { slug: cs } }); if (c) colIds.push({ collectionId: c.id }) }
            await prisma.work.create({ data: { title: w.title, slug, genre: w.genre, content: w.content, excerpt: w.excerpt, status: 'published', isFeatured: w.featured, publishedAt: new Date(), tags: { create: tagIds }, collections: { create: colIds } } })
        }
    }
    console.log('✅ Sample works created')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
