// seed-data.cjs — Comprehensive NTHL data seed
// Dùng cho cả local dev và Docker production
// Chạy: node prisma/seed-data.cjs
// Docker: docker exec vibe-app node prisma/seed-data.cjs

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const prisma = new PrismaClient()

function makeSlug(text) {
    return text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
}

async function main() {
    console.log('🌱 Bắt đầu seed data NTHL...\n')

    // ═══════════════════════════════════════════
    // 1. ADMIN USER
    // ═══════════════════════════════════════════
    const email = process.env.ADMIN_EMAIL || 'admin@admin.com'
    const password = process.env.ADMIN_PASSWORD || '112345678'
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.adminUser.upsert({
        where: { email },
        update: { passwordHash, loginAttempts: 0, lockUntil: null },
        create: { email, passwordHash },
    })
    console.log('✅ Admin:', email)

    // ═══════════════════════════════════════════
    // 2. AUTHOR PROFILE
    // ═══════════════════════════════════════════
    await prisma.authorProfile.upsert({
        where: { id: 'singleton' },
        update: {
            name: 'Nguyễn Thế Hoàng Linh',
            bioShort: 'Nhà thơ · Hà Nội',
            bio: `Nguyễn Thế Hoàng Linh (sinh năm 1982 tại Hà Nội) là nhà thơ, nhà văn Việt Nam được giới phê bình mệnh danh là "Thi tài tuổi 20". Anh bắt đầu sáng tác từ năm 12 tuổi, đến năm 20 tuổi đã viết khoảng 2.000 bài thơ.

Năm 2004, tiểu thuyết "Chuyện của thiên tài" đoạt Giải thưởng Hội Nhà văn Hà Nội. Năm 2021, bài thơ "Bắt nạt" được đưa vào sách giáo khoa Ngữ văn lớp 6 bộ Kết nối tri thức với cuộc sống.

Phong cách thơ của anh giản dị đến mức cổ điển, đôi khi đùa cợt nhưng chứa đựng triết lý sâu sắc. Thơ của anh được nhiều thế hệ bạn đọc yêu mến, đặc biệt là giới trẻ.`,
            socialLinks: JSON.stringify({
                facebook: 'https://www.facebook.com/nguyenthehoanglinh',
            }),
            awards: JSON.stringify([
                { title: 'Giải thưởng Hội Nhà văn Hà Nội', year: 2004, description: 'Tiểu thuyết "Chuyện của thiên tài"' },
                { title: 'Tác phẩm vào SGK lớp 6', year: 2021, description: 'Bài thơ "Bắt nạt" – SGK Ngữ văn 6, bộ Kết nối tri thức' },
            ]),
            publications: JSON.stringify([
                { title: 'Mầm sống' },
                { title: 'Uống một ngụm nước biển' },
                { title: 'Lẽ giản đơn', year: 2006 },
                { title: 'Mỗi quốc gia là một thành phố của thế giới', year: 2009 },
                { title: 'Hở', year: 2011 },
                { title: 'Mật thư', year: 2012 },
                { title: 'Em giấu gì ở trong lòng thế', year: 2013 },
                { title: 'Bé tập tô' },
                { title: 'Ra vườn nhặt nắng', year: 2015 },
                { title: 'Chuyện của thiên tài', year: 2004 },
            ]),
        },
        create: {
            id: 'singleton',
            name: 'Nguyễn Thế Hoàng Linh',
            bioShort: 'Nhà thơ · Hà Nội',
            bio: 'Nguyễn Thế Hoàng Linh (sinh năm 1982 tại Hà Nội) là nhà thơ, nhà văn Việt Nam.',
            socialLinks: '{}', awards: '[]', publications: '[]',
        },
    })
    console.log('✅ Author profile')

    // ═══════════════════════════════════════════
    // 3. GENRES
    // ═══════════════════════════════════════════
    const genres = [
        { value: 'poem', label: 'Thơ', emoji: '📝', order: 0, showInSidebar: true },
        { value: 'short_story', label: 'Truyện ngắn', emoji: '📖', order: 1, showInSidebar: true },
        { value: 'essay', label: 'Tản văn', emoji: '✍️', order: 2, showInSidebar: true },
        { value: 'novel', label: 'Tiểu thuyết', emoji: '📚', order: 3, showInSidebar: true },
        { value: 'memoir', label: 'Bút ký', emoji: '🖊️', order: 4, showInSidebar: true },
        { value: 'children', label: 'Thơ thiếu nhi', emoji: '🧒', order: 5, showInSidebar: true },
        { value: 'photo', label: 'Ảnh', emoji: '📷', order: 6, showInSidebar: true },
        { value: 'video', label: 'Video', emoji: '🎬', order: 7, showInSidebar: true },
    ]
    for (const g of genres) {
        await prisma.genre.upsert({
            where: { value: g.value },
            update: { label: g.label, emoji: g.emoji, order: g.order, showInSidebar: g.showInSidebar },
            create: g,
        })
    }
    console.log('✅ Genres:', genres.length)

    // ═══════════════════════════════════════════
    // 4. TAGS
    // ═══════════════════════════════════════════
    const tagNames = [
        'Tình yêu', 'Cuộc sống', 'Thiếu nhi', 'Triết lý', 'Thiên nhiên',
        'Nỗi buồn', 'Hạnh phúc', 'Gia đình', 'Tuổi trẻ', 'Cô đơn',
        'Hài hước', 'Tự sự', 'Xã hội', 'Kỷ niệm', 'Mùa',
    ]
    for (const name of tagNames) {
        const slug = makeSlug(name)
        await prisma.tag.upsert({ where: { slug }, update: {}, create: { name, slug } })
    }
    console.log('✅ Tags:', tagNames.length)

    // ═══════════════════════════════════════════
    // 5. BOOKS
    // ═══════════════════════════════════════════
    const books = [
        { title: 'Ra vườn nhặt nắng', description: 'Tập thơ thiếu nhi best-seller, NXB Trẻ 2015', publisher: 'NXB Trẻ', year: 2015, order: 0 },
        { title: 'Em giấu gì ở trong lòng thế', description: 'Tập thơ tình in từ bản chép tay', publisher: 'NXB Hội Nhà Văn', year: 2013, order: 1 },
        { title: 'Mật thư', description: 'Tập thơ', publisher: 'NXB Hội Nhà Văn', year: 2012, order: 2 },
        { title: 'Hở', description: 'Tập thơ', publisher: 'NXB Hội Nhà Văn', year: 2011, order: 3 },
        { title: 'Lẽ giản đơn', description: 'Tập thơ đầu tay', publisher: 'NXB Hội Nhà Văn', year: 2006, order: 4 },
        { title: 'Chuyện của thiên tài', description: 'Tiểu thuyết đoạt Giải thưởng Hội Nhà văn Hà Nội 2004', publisher: 'NXB Kim Đồng', year: 2004, order: 5 },
    ]
    for (const b of books) {
        const slug = makeSlug(b.title)
        await prisma.book.upsert({
            where: { slug },
            update: { description: b.description, publisher: b.publisher, year: b.year, order: b.order },
            create: { title: b.title, slug, ...b },
        })
    }
    console.log('✅ Books:', books.length)

    // ═══════════════════════════════════════════
    // 6. COLLECTIONS
    // ═══════════════════════════════════════════
    const collections = [
        { title: 'Ra vườn nhặt nắng', description: 'Tập thơ thiếu nhi nổi tiếng nhất, NXB Trẻ 2015' },
        { title: 'Em giấu gì ở trong lòng thế', description: 'Tập thơ tình in từ bản chép tay, 2013' },
        { title: 'Mật thư', description: 'Tập thơ 2012' },
        { title: 'Hở', description: 'Tập thơ 2011' },
        { title: 'Lẽ giản đơn', description: 'Tập thơ đầu tay 2006' },
        { title: 'Chuyện của thiên tài', description: 'Tiểu thuyết đoạt giải Hội Nhà văn HN 2004' },
    ]
    for (let i = 0; i < collections.length; i++) {
        const slug = makeSlug(collections[i].title)
        await prisma.collection.upsert({
            where: { slug },
            update: { description: collections[i].description },
            create: { title: collections[i].title, slug, description: collections[i].description, order: i },
        })
    }
    console.log('✅ Collections:', collections.length)

    // ═══════════════════════════════════════════
    // 7. WORKS — Thơ chính của NTHL
    // ═══════════════════════════════════════════
    const works = [
        // ── Ra vườn nhặt nắng (Thơ thiếu nhi) ──
        {
            title: 'Bắt nạt', genre: 'poem', featured: true,
            content: `Bắt nạt là xấu lắm
Đừng bắt nạt bạn ơi
Bất cứ ai trên đời
Đều không cần bắt nạt

Sao không thử giật nắng
Bắt mưa bắt gió đi
Sao không vật tay xem
Ai cổ tay khỏe hơn

Bạn nào bắt nạt bạn
Thử bắt nạt khổng lồ
Mà khổng lồ hiền quá
Cũng chẳng thể bắt nạt

Những bạn nào bắt nạt
Có phải dũng cảm đâu
Thử hỏi xem bố mẹ
Có dũng cảm đâu nào

Đừng bắt nạt bạn nào
Dù là ai đi nữa
Đừng bắt nạt cây hoa
Đừng bắt nạt tiếng Việt`,
            excerpt: 'Bắt nạt là xấu lắm / Đừng bắt nạt bạn ơi / Bất cứ ai trên đời / Đều không cần bắt nạt...',
            tags: ['thieu-nhi', 'cuoc-song', 'xa-hoi'],
            collections: ['ra-vuon-nhat-nang'],
            featuredDate: '2026-02-27',
        },
        {
            title: 'Ra vườn nhặt nắng', genre: 'poem', featured: true,
            content: `Ông mặc áo nâu
Ra vườn nhặt nắng
Ông nhặt nhặt hoài
Nắng rơi đầy lối

Bà xách rổ ra
Nhặt nắng cùng ông
Nắng bay vào rổ
Vàng ươm vàng ươm

Cháu chạy ra vườn
Cháu cuộn trong nắng
Ông bà nhìn cháu
Cười hiền cười hiền`,
            excerpt: 'Ông mặc áo nâu / Ra vườn nhặt nắng / Ông nhặt nhặt hoài / Nắng rơi đầy lối...',
            tags: ['thieu-nhi', 'gia-dinh', 'thien-nhien'],
            collections: ['ra-vuon-nhat-nang'],
        },
        {
            title: 'Con chim chiền chiện', genre: 'poem', featured: false,
            content: `Con chim chiền chiện
Bay vút trời cao
Lúa ở dưới
Chín vàng bao la

Chim bay rồi
Chim sà xuống
Ngậm một hạt lúa
Bay mất tăm

Bạn có thấy không
Hạt lúa nhỏ thôi
Mà chim bay xa
Bao la trời đất`,
            excerpt: 'Con chim chiền chiện / Bay vút trời cao / Lúa ở dưới / Chín vàng bao la...',
            tags: ['thieu-nhi', 'thien-nhien'],
            collections: ['ra-vuon-nhat-nang'],
        },
        {
            title: 'Mẹ', genre: 'poem', featured: true,
            content: `Mẹ giặt cái hồn em bé
Vắt lên sào phơi nắng
Gió đến ướm thử một lần
Gió dỏng tai lên nghe

Em bé thì nằm ngủ
Giấc mơ đi chơi xa
Khi em bé thức dậy
Hồn đã thơm trong lành`,
            excerpt: 'Mẹ giặt cái hồn em bé / Vắt lên sào phơi nắng...',
            tags: ['thieu-nhi', 'gia-dinh', 'hanh-phuc'],
            collections: ['ra-vuon-nhat-nang'],
        },
        {
            title: 'Nếu biết trăm năm là hữu hạn', genre: 'poem', featured: false,
            content: `Nếu biết trăm năm là hữu hạn
Nếu biết đời người rồi cũng qua
Liệu ta có còn kiêu hãnh
Liệu ta có sống khác không ta

Nếu biết rằng cuối cùng rồi cũng một mình
Sẽ không mang theo được gì
Chỉ mang theo những thứ vô hình
Ta có đổi cách ta sống không?`,
            excerpt: 'Nếu biết trăm năm là hữu hạn / Nếu biết đời người rồi cũng qua...',
            tags: ['triet-ly', 'cuoc-song', 'tu-su'],
            collections: [],
        },

        // ── Thơ tình / Em giấu gì ở trong lòng thế ──
        {
            title: 'Em giấu gì ở trong lòng thế', genre: 'poem', featured: true,
            content: `Em giấu gì ở trong lòng thế
Cho bên ngoài lạnh vậy – người ơi
Sao không đem ra ngoài mà sưởi
Cho đời bớt lạnh với nhau thôi

Em giấu gì ở trong lòng thế
Cho ngoài kia rộng mà trong đây chật
Em có hoa thì mang ra cắm
Cho nhà mình thêm một chậu hoa`,
            excerpt: 'Em giấu gì ở trong lòng thế / Cho bên ngoài lạnh vậy – người ơi...',
            tags: ['tinh-yeu', 'tu-su'],
            collections: ['em-giau-gi-o-trong-long-the'],
        },
        {
            title: 'Giá mà được chết đi một lúc', genre: 'poem', featured: true,
            content: `Giá mà được chết đi một lúc
rồi sống lại
thì tốt

Chết đi cho bớt mệt
sống lại cho bớt nhớ

Chết đi thì yên ổn
sống lại thì vui thôi`,
            excerpt: 'Giá mà được chết đi một lúc / rồi sống lại / thì tốt...',
            tags: ['triet-ly', 'noi-buon', 'cuoc-song'],
            collections: ['em-giau-gi-o-trong-long-the'],
        },
        {
            title: 'Buổi sáng', genre: 'poem', featured: false,
            content: `Buổi sáng thức dậy
Người nhẹ nhàng
Như không có gì
Phải lo lắng cả

Nắng trải qua cửa sổ
Lặng lẽ
Như thể nắng
Chưa bao giờ vắng mặt

Hôm nay
Cũng giống như mọi ngày
Nhưng mọi ngày
Đều không giống hôm nay`,
            excerpt: 'Buổi sáng thức dậy / Người nhẹ nhàng / Như không có gì / Phải lo lắng cả...',
            tags: ['cuoc-song', 'hanh-phuc', 'triet-ly'],
            collections: [],
        },

        // ── Lẽ giản đơn ──
        {
            title: 'Lẽ giản đơn', genre: 'poem', featured: true,
            content: `Cái gì cũng từ
cái giản đơn nhất
mà nên

Tình yêu
từ một cái nhìn
Mùa xuân
từ một cành xanh
Bình minh
từ một tia sáng

Còn hạnh phúc
từ khi biết mình
đang hạnh phúc`,
            excerpt: 'Cái gì cũng từ / cái giản đơn nhất / mà nên...',
            tags: ['triet-ly', 'hanh-phuc'],
            collections: ['le-gian-don'],
        },
        {
            title: 'Cảm ơn', genre: 'poem', featured: false,
            content: `Cảm ơn bạn
vì đã là bạn
chứ không phải ai khác

Cảm ơn tôi
vì đã là tôi
chứ không phải ai khác

Cảm ơn ngày
cảm ơn đêm
cảm ơn nắng mưa
cảm ơn trời đất`,
            excerpt: 'Cảm ơn bạn / vì đã là bạn / chứ không phải ai khác...',
            tags: ['hanh-phuc', 'cuoc-song'],
            collections: ['le-gian-don'],
        },
        {
            title: 'Tự do', genre: 'poem', featured: false,
            content: `Tự do là được buồn
khi muốn buồn
Tự do là được vui
khi muốn vui

Tự do là được im lặng
khi không muốn nói
Tự do là được nói
khi không ai hỏi

Tự do là được sống
theo cách mình muốn sống
Dù cách đó
không ai hiểu`,
            excerpt: 'Tự do là được buồn / khi muốn buồn / Tự do là được vui / khi muốn vui...',
            tags: ['triet-ly', 'tu-su', 'cuoc-song'],
            collections: ['le-gian-don'],
        },

        // ── Mật thư ──
        {
            title: 'Mật thư', genre: 'poem', featured: false,
            content: `Anh viết cho em một bức mật thư
Bằng mực vô hình
Trên giấy vô hình
Gửi qua đường bay vô hình

Em nhận được rồi phải không
Anh biết em nhận được
Vì đôi mắt em
Bỗng sáng lên`,
            excerpt: 'Anh viết cho em một bức mật thư / Bằng mực vô hình...',
            tags: ['tinh-yeu', 'hai-huoc'],
            collections: ['mat-thu'],
        },
        {
            title: 'Thương', genre: 'poem', featured: false,
            content: `Thương là chẳng nói gì
mà hiểu
Thương là chẳng làm gì
mà nhớ

Thương là đứng rất xa
mà gần
Thương là chẳng thấy nhau
mà thấy

Thương rồi thì
không cần nói thương
Vì thương rồi thì
thương vẫn thương`,
            excerpt: 'Thương là chẳng nói gì / mà hiểu / Thương là chẳng làm gì / mà nhớ...',
            tags: ['tinh-yeu', 'triet-ly'],
            collections: ['mat-thu'],
        },

        // ── Hở ──
        {
            title: 'Hở', genre: 'poem', featured: false,
            content: `Hở ra một chút thôi
là gió đã vào rồi
Hở ra một chút nữa
là mưa đã ướt rồi

Hở ra một chút thôi
là nhớ đã đầy rồi
Hở ra một chút nữa
là thương đã tràn rồi`,
            excerpt: 'Hở ra một chút thôi / là gió đã vào rồi...',
            tags: ['tinh-yeu', 'noi-buon'],
            collections: ['ho'],
        },
        {
            title: 'Đợi', genre: 'poem', featured: false,
            content: `Đợi một người
Lâu nhất là bao lâu

Đợi đến khi
Không nhớ mình đang đợi

Đợi đến khi
Đợi thành thói quen

Đợi đến khi
Quên cả người mình đợi

Rồi một hôm
Người ấy đến
Mình ngỡ ngàng—
Ơ mình đang đợi ai nhỉ`,
            excerpt: 'Đợi một người / Lâu nhất là bao lâu / Đợi đến khi / Không nhớ mình đang đợi...',
            tags: ['tinh-yeu', 'co-don', 'hai-huoc'],
            collections: ['ho'],
        },

        // ── Tản văn ──
        {
            title: 'Hà Nội vào thu', genre: 'essay', featured: false,
            content: `Hà Nội vào thu, phố phường bỗng dưng hiền lành hẳn. Cái nắng gắt của mùa hè rút đi từ lúc nào, thay vào đó là những buổi chiều mát dịu, gió hiu hiu thổi qua những tán cây cổ thụ trên phố Phan Đình Phùng.

Mùa thu Hà Nội, người ta hay nói đến hoa sữa. Nhưng với tôi, mùa thu là mùi cốm mới. Là tiếng rao "Ai cốm đê..." kéo dài trong ngõ nhỏ. Là những hạt cốm xanh mướt gói trong lá sen, thơm đến nao lòng.

Hà Nội bốn mùa, mùa nào cũng đẹp. Nhưng thu là mùa đẹp nhất. Đẹp đến mức, ai đi xa cũng nhớ. Nhớ đến mức, muốn quay về ngay lập tức.`,
            excerpt: 'Hà Nội vào thu, phố phường bỗng dưng hiền lành hẳn...',
            tags: ['cuoc-song', 'ky-niem', 'mua'],
            collections: [],
        },
        {
            title: 'Viết là sống', genre: 'essay', featured: true,
            content: `Người ta hỏi tôi: viết để làm gì? Tôi trả lời: viết là sống. Không viết thì chết — không phải chết thể xác, mà chết tâm hồn.

Từ năm 12 tuổi, tôi đã viết. Viết như thở. Viết như ăn cơm uống nước. Đến năm 20 tuổi, tôi đã có khoảng hai nghìn bài thơ. Người ta bảo tôi là thiên tài. Tôi bảo: không, tôi chỉ là người siêng viết.

Viết không phải để nổi tiếng. Viết không phải để kiếm tiền. Viết là để giải phóng những thứ đang nhốt trong lòng. Viết xong thì nhẹ. Nhẹ rồi thì vui. Vui rồi thì sống.

Bạn có muốn thử không? Hãy cầm bút lên. Viết bất cứ điều gì bạn đang nghĩ. Đừng sợ viết dở. Vì dở cũng là viết. Mà viết là sống.`,
            excerpt: 'Người ta hỏi tôi: viết để làm gì? Tôi trả lời: viết là sống...',
            tags: ['tu-su', 'triet-ly', 'cuoc-song'],
            collections: [],
        },

        // ── Bút ký ──
        {
            title: 'Tuổi hai mươi và hai nghìn bài thơ', genre: 'memoir', featured: false,
            content: `Ngày tôi hai mươi tuổi, ai đó đếm giúp tôi: anh đã viết gần hai nghìn bài thơ.

Hai nghìn bài thơ. Nghe thì nhiều. Nhưng chia ra mỗi ngày từ năm mười hai tuổi, tức là khoảng mười năm, tức là khoảng ba nghìn sáu trăm ngày, thì mỗi ngày chưa đến một bài. Vậy thì có gì đâu mà ghê gớm?

Tôi không cố viết nhiều. Tôi chỉ viết khi nào muốn viết. Có ngày viết ba bốn bài. Có tuần không viết bài nào. Thơ đến thì viết, thơ đi thì thôi.

Người ta gọi tôi là "thi tài tuổi 20". Tôi gọi mình là đứa trẻ may mắn tìm được thứ mình yêu sớm.`,
            excerpt: 'Ngày tôi hai mươi tuổi, ai đó đếm giúp tôi: anh đã viết gần hai nghìn bài thơ...',
            tags: ['tu-su', 'ky-niem', 'tuoi-tre'],
            collections: [],
        },

        // ── Thêm thơ ──
        {
            title: 'Trẻ con', genre: 'poem', featured: false,
            content: `Trẻ con vui thì cười
Buồn thì khóc
Giận thì la
Mệt thì ngủ

Lớn lên
Vui cũng không cười
Buồn cũng không khóc
Giận cũng không la
Mệt cũng không ngủ

Rồi đi khám bác sĩ
Bác sĩ bảo: bệnh thần kinh
Tôi bảo: không
Tôi chỉ là người lớn thôi`,
            excerpt: 'Trẻ con vui thì cười / Buồn thì khóc / Giận thì la / Mệt thì ngủ...',
            tags: ['triet-ly', 'hai-huoc', 'cuoc-song'],
            collections: [],
        },
        {
            title: 'Một ngày', genre: 'poem', featured: false,
            content: `Sáng ra mở mắt
thấy trời xanh
— vui

Trưa nắng gắt
mồ hôi nhỏ giọt
— mệt

Chiều mưa rào
ướt hết quần áo
— buồn

Tối về nhà
thấy con cười
— quên hết`,
            excerpt: 'Sáng ra mở mắt / thấy trời xanh / — vui...',
            tags: ['cuoc-song', 'gia-dinh', 'hanh-phuc'],
            collections: [],
        },
        {
            title: 'Yêu', genre: 'poem', featured: false,
            content: `Yêu là gì
Là khi nghĩ đến một người
mà không cần lý do

Là khi nhìn một người
mà quên cả thế giới

Là khi nghe một người
mà tim đập hai nhịp

Là khi mất một người
mà mất cả chính mình`,
            excerpt: 'Yêu là gì / Là khi nghĩ đến một người / mà không cần lý do...',
            tags: ['tinh-yeu', 'noi-buon'],
            collections: [],
        },
    ]

    let created = 0
    for (const w of works) {
        const slug = makeSlug(w.title)
        const exists = await prisma.work.findUnique({ where: { slug } })
        if (!exists) {
            // Resolve tags
            const tagIds = []
            for (const ts of w.tags) {
                const t = await prisma.tag.findUnique({ where: { slug: ts } })
                if (t) tagIds.push({ tagId: t.id })
            }
            // Resolve collections
            const colIds = []
            for (const cs of w.collections) {
                const c = await prisma.collection.findUnique({ where: { slug: cs } })
                if (c) colIds.push({ collectionId: c.id })
            }
            await prisma.work.create({
                data: {
                    title: w.title, slug, genre: w.genre,
                    content: w.content, excerpt: w.excerpt,
                    status: 'published', isFeatured: w.featured,
                    publishedAt: new Date(),
                    featuredDate: w.featuredDate ? new Date(w.featuredDate) : null,
                    tags: { create: tagIds },
                    collections: { create: colIds },
                },
            })
            created++
        }
    }
    console.log(`✅ Works: ${created} created (${works.length - created} already existed)`)

    console.log('\n🎉 Seed hoàn tất!')
}

main()
    .catch(e => { console.error('❌ Error:', e); process.exit(1) })
    .finally(() => prisma.$disconnect())
