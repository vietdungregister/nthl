// Seed script - run via prisma db seed  
// or: npx prisma db seed
const { PrismaClient } = require('./src/generated/prisma/internal/class.cjs')
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
    console.log('Admin user created/updated:', email)

    await prisma.authorProfile.upsert({
        where: { id: 'singleton' },
        update: {},
        create: {
            id: 'singleton',
            name: 'Nguyễn Thế Hoàng Linh',
            bioShort: 'Nhà thơ, nhà văn — "Thi tài tuổi 20"',
            bio: 'Nguyễn Thế Hoàng Linh (sinh năm 1982 tại Hà Nội) là nhà thơ, nhà văn Việt Nam được giới phê bình mệnh danh là "Thi tài tuổi 20". Anh bắt đầu sáng tác từ năm 12 tuổi, đến năm 20 tuổi đã viết khoảng 2.000 bài thơ.\n\nNăm 2004, tiểu thuyết "Chuyện của thiên tài" đoạt Giải thưởng Hội Nhà văn Hà Nội. Năm 2021, bài thơ "Bắt nạt" được đưa vào sách giáo khoa Ngữ văn lớp 6.\n\nPhong cách thơ của anh giản dị đến mức cổ điển, đôi khi đùa cợt nhưng chứa đựng triết lý sâu sắc.',
            socialLinks: JSON.stringify({ facebook: 'https://www.facebook.com/nguyenthehoanglinh' }),
            awards: JSON.stringify([
                { title: 'Giải thưởng Hội Nhà văn Hà Nội', year: 2004, description: 'Tiểu thuyết "Chuyện của thiên tài"' },
                { title: 'Tác phẩm vào SGK lớp 6', year: 2021, description: 'Bài thơ "Bắt nạt"' },
            ]),
            publications: JSON.stringify([
                { title: 'Mầm sống' }, { title: 'Uống một ngụm nước biển' },
                { title: 'Lẽ giản đơn', year: 2006 }, { title: 'Mỗi quốc gia là một thành phố của thế giới', year: 2009 },
                { title: 'Hở', year: 2011 }, { title: 'Mật thư', year: 2012 },
                { title: 'Em giấu gì ở trong lòng thế', year: 2013 }, { title: 'Bé tập tô' },
                { title: 'Ra vườn nhặt nắng', year: 2015 }, { title: 'Chuyện của thiên tài', year: 2004 },
                { title: 'Đọc kỹ hướng dẫn sử dụng trước khi dùng' }, { title: 'Văn chương động' },
            ]),
        },
    })
    console.log('Author profile created')

    const defaultTags = ['Tình yêu', 'Cuộc sống', 'Thiếu nhi', 'Triết lý', 'Thiên nhiên', 'Nỗi buồn', 'Hạnh phúc', 'Gia đình', 'Tuổi trẻ', 'Cô đơn']
    for (const tagName of defaultTags) {
        const slug = tagName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '-')
        await prisma.tag.upsert({ where: { slug }, update: {}, create: { name: tagName, slug } })
    }
    console.log('Default tags created')

    const defaultCollections = [
        { title: 'Ra vườn nhặt nắng', description: 'Tập thơ thiếu nhi nổi tiếng, xuất bản 2015' },
        { title: 'Em giấu gì ở trong lòng thế', description: 'Tập thơ tình in từ bản chép tay, 2013' },
        { title: 'Mật thư', description: 'Tập thơ xuất bản 2012' },
        { title: 'Chuyện của thiên tài', description: 'Tiểu thuyết đoạt giải Hội Nhà văn Hà Nội 2004' },
    ]
    for (let i = 0; i < defaultCollections.length; i++) {
        const col = defaultCollections[i]
        const slug = col.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '-')
        await prisma.collection.upsert({ where: { slug }, update: {}, create: { title: col.title, slug, description: col.description, order: i } })
    }
    console.log('Default collections created')

    // Sample works
    const sampleWorks = [
        {
            title: 'Bắt nạt', genre: 'poem', isFeatured: true,
            content: 'Bắt nạt là xấu lắm\nĐừng bắt nạt bạn ơi\nBất cứ ai trên đời\nĐều không cần bắt nạt\n\nSao không thử giật nắng\nBắt mưa bắt gió đi\nSao không vật tay xem\nAi cổ tay khỏe hơn\n\nBạn nào bắt nạt bạn\nThử bắt nạt khổng lồ\nMà khổng lồ hiền quá\nCũng chẳng thể bắt nạt\n\nNhững bạn nào bắt nạt\nCó phải dũng cảm đâu\nThử hỏi xem bố mẹ\nCó dũng cảm đâu nào\n\nĐừng bắt nạt bạn nào\nDù là ai đi nữa\nĐừng bắt nạt cây hoa\nĐừng bắt nạt tiếng Việt',
            excerpt: 'Bắt nạt là xấu lắm / Đừng bắt nạt bạn ơi...',
            tags: ['thieu-nhi', 'cuoc-song'], collections: ['ra-vuon-nhat-nang'],
        },
        {
            title: 'Ra vườn nhặt nắng', genre: 'poem', isFeatured: true,
            content: 'Ông mặc áo nâu\nRa vườn nhặt nắng\nÔng nhặt nhặt hoài\nNắng rơi đầy lối\n\nBà xách rổ ra\nNhặt nắng cùng ông\nNắng bay vào rổ\nVàng ươm vàng ươm\n\nCháu chạy ra vườn\nCháu cuộn trong nắng\nÔng bà nhìn cháu\nCười hiền cười hiền',
            excerpt: 'Ông mặc áo nâu / Ra vườn nhặt nắng...',
            tags: ['thieu-nhi', 'gia-dinh', 'thien-nhien'], collections: ['ra-vuon-nhat-nang'],
        },
        {
            title: 'Giá mà được chết đi một lúc', genre: 'poem', isFeatured: true,
            content: 'Giá mà được chết đi một lúc\nrồi sống lại\nthì tốt\n\nChết đi cho bớt mệt\nsống lại cho bớt nhớ\n\nChết đi thì yên ổn\nsống lại thì vui thôi',
            excerpt: 'Giá mà được chết đi một lúc / rồi sống lại / thì tốt...',
            tags: ['triet-ly', 'cuoc-song', 'noi-buon'], collections: [],
        },
        {
            title: 'Lẽ giản đơn', genre: 'poem', isFeatured: true,
            content: 'Cái gì cũng từ\ncái giản đơn nhất\nmà nên\n\nTình yêu\ntừ một cái nhìn\nMùa xuân\ntừ một cành xanh\nBình minh\ntừ một tia sáng\n\nCòn hạnh phúc\ntừ khi biết mình\nđang hạnh phúc',
            excerpt: 'Cái gì cũng từ / cái giản đơn nhất / mà nên...',
            tags: ['triet-ly', 'hanh-phuc'], collections: [],
        },
        {
            title: 'Cảm ơn', genre: 'poem', isFeatured: false,
            content: 'Cảm ơn bạn\nvì đã là bạn\nchứ không phải ai khác\n\nCảm ơn tôi\nvì đã là tôi\nchứ không phải ai khác\n\nCảm ơn ngày\ncảm ơn đêm\ncảm ơn nắng mưa\ncảm ơn trời đất',
            excerpt: 'Cảm ơn bạn / vì đã là bạn / chứ không phải ai khác...',
            tags: ['hanh-phuc', 'cuoc-song'], collections: [],
        },
    ]

    for (const work of sampleWorks) {
        const slug = work.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '-')
        const existing = await prisma.work.findUnique({ where: { slug } })
        if (!existing) {
            const tagConnections = []
            for (const ts of work.tags) {
                const tag = await prisma.tag.findUnique({ where: { slug: ts } })
                if (tag) tagConnections.push({ tagId: tag.id })
            }
            const colConnections = []
            for (const cs of work.collections) {
                const col = await prisma.collection.findUnique({ where: { slug: cs } })
                if (col) colConnections.push({ collectionId: col.id })
            }
            await prisma.work.create({
                data: {
                    title: work.title, slug, genre: work.genre, content: work.content,
                    excerpt: work.excerpt, status: 'published', isFeatured: work.isFeatured,
                    publishedAt: new Date(),
                    tags: { create: tagConnections },
                    collections: { create: colConnections },
                },
            })
        }
    }
    console.log('Sample works created')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
