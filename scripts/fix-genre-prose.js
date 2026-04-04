const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== FIX GENRE: prose → stt ===\n');

  // 1. Kiểm tra genre 'stt' đã tồn tại chưa
  const existing = await prisma.genre.findFirst({ where: { value: 'stt' } });
  if (existing) {
    console.log('⚠️  Genre "stt" đã tồn tại:', existing);
  } else {
    // Tìm order hiện tại cao nhất để chèn đúng vị trí (trước poem)
    const poemGenre = await prisma.genre.findFirst({ where: { value: 'poem' } });
    const poemOrder = poemGenre?.order ?? 2;

    // Dịch chuyển các genre có order >= poemOrder xuống 1
    await prisma.genre.updateMany({
      where: { order: { gte: poemOrder } },
      data: { order: { increment: 1 } },
    });

    // Tạo genre mới 'stt' với order = poemOrder (trước poem)
    const newGenre = await prisma.genre.create({
      data: {
        value: 'stt',
        label: 'Stt',
        emoji: '📄',
        order: poemOrder,
        showInSidebar: true,
      },
    });
    console.log('✅ Đã tạo genre mới:', newGenre);
  }

  // 2. Migrate tất cả works có genre='prose' → 'stt'
  const beforeCount = await prisma.work.count({ where: { genre: 'prose' } });
  console.log(`\n📦 Works có genre="prose": ${beforeCount}`);

  const updated = await prisma.work.updateMany({
    where: { genre: 'prose' },
    data: { genre: 'stt' },
  });
  console.log(`✅ Đã migrate ${updated.count} works: prose → stt`);

  // 3. Verify
  const afterProse = await prisma.work.count({ where: { genre: 'prose' } });
  const afterStt = await prisma.work.count({ where: { genre: 'stt', status: 'published', deletedAt: null } });
  const total = await prisma.work.count({ where: { status: 'published', deletedAt: null } });

  console.log('\n=== VERIFICATION ===');
  console.log(`Còn lại genre="prose": ${afterProse}`);
  console.log(`Genre="stt" (published): ${afterStt}`);
  console.log(`Total published: ${total}`);

  // 4. In lại toàn bộ genre counts
  const counts = await prisma.work.groupBy({
    by: ['genre'],
    where: { status: 'published', deletedAt: null },
    _count: { _all: true },
    orderBy: { _count: { genre: 'desc' } },
  });
  console.log('\nFINAL GENRE COUNTS:');
  let sum = 0;
  for (const g of counts) {
    console.log(`  ${g.genre}: ${g._count._all}`);
    sum += g._count._all;
  }
  console.log(`  --- SUM: ${sum} (total: ${total})`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
