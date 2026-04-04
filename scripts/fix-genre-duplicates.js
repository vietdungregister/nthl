const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DỌN DẸP GENRE TRÙNG LẶP ===\n');

  // 1. Gộp "Tản văn" (1 work) → "essay" (đã có label "Tản văn")
  const tanVanWorks = await prisma.work.count({ where: { genre: 'Tản văn' } });
  console.log(`Works có genre="Tản văn": ${tanVanWorks}`);
  if (tanVanWorks > 0) {
    await prisma.work.updateMany({ where: { genre: 'Tản văn' }, data: { genre: 'essay' } });
    console.log(`✅ Gộp ${tanVanWorks} work(s): "Tản văn" → "essay"`);
  }
  // Xóa entry "Tản văn" khỏi Genre table
  const deletedTanVan = await prisma.genre.deleteMany({ where: { value: 'Tản văn' } });
  console.log(`✅ Xóa Genre entry "Tản văn": ${deletedTanVan.count} entry`);

  // 2. Xóa genre "Bút ký" (0 works, trùng với memoir)
  const butKyWorks = await prisma.work.count({ where: { genre: 'Bút ký' } });
  console.log(`\nWorks có genre="Bút ký": ${butKyWorks}`);
  const deletedButKy = await prisma.genre.deleteMany({ where: { value: 'Bút ký' } });
  console.log(`✅ Xóa Genre entry "Bút ký": ${deletedButKy.count} entry`);

  // 3. Dọn genre table còn lại: short_story, novel, children (0 works) — giữ lại vì 
  // đây là genre dự phòng cho tương lai, không ảnh hưởng đến count

  // 4. Verify final state
  const counts = await prisma.work.groupBy({
    by: ['genre'],
    where: { status: 'published', deletedAt: null },
    _count: { _all: true },
    orderBy: { _count: { genre: 'desc' } },
  });
  const total = await prisma.work.count({ where: { status: 'published', deletedAt: null } });

  console.log('\n=== FINAL GENRE COUNTS ===');
  let sum = 0;
  for (const g of counts) {
    console.log(`  ${g.genre}: ${g._count._all}`);
    sum += g._count._all;
  }
  console.log(`  --- SUM: ${sum} | TOTAL: ${total} | MATCH: ${sum === total ? '✅' : '❌'}`);

  console.log('\n=== GENRE TABLE ===');
  const genres = await prisma.genre.findMany({ orderBy: { order: 'asc' } });
  for (const g of genres) {
    const wc = counts.find(c => c.genre === g.value)?._count._all ?? 0;
    console.log(`  [${g.order}] ${g.value} (${g.label}) ${g.emoji} — ${wc} works`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
