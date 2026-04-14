const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
    const books = await p.book.findMany();
    console.log('Books:', books.length);
    books.forEach(x => console.log(' -', x.title, '|', x.slug));

    const videos = await p.work.findMany({ where: { genre: 'video', status: 'published' }, select: { id: true, title: true, slug: true, coverImageUrl: true } });
    console.log('\nVideos:', videos.length);
    videos.forEach(x => console.log(' -', x.title, '|', x.coverImageUrl));

    await p.$disconnect();
})();
