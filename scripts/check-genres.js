const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.work.count({ where: { status: 'published', deletedAt: null } });
  console.log('TOTAL PUBLISHED:', total);
  
  const genreCounts = await prisma.work.groupBy({
    by: ['genre'],
    where: { status: 'published', deletedAt: null },
    _count: { _all: true },
    orderBy: { _count: { genre: 'desc' } },
  });
  console.log('\nGENRE COUNTS (from Work table):');
  let genreSum = 0;
  for (const g of genreCounts) {
    console.log(`  ${g.genre}: ${g._count._all}`);
    genreSum += g._count._all;
  }
  console.log(`  ---\n  SUM: ${genreSum}`);
  
  const genres = await prisma.genre.findMany({ orderBy: { order: 'asc' } });
  console.log('\nGENRE TABLE (sidebar config):');
  for (const g of genres) {
    console.log(`  ${g.value} - "${g.label}" ${g.emoji} (sidebar: ${g.showInSidebar})`);
  }
  
  const genreValues = new Set(genres.map(g => g.value));
  const sidebarGenres = new Set(genres.filter(g => g.showInSidebar).map(g => g.value));
  
  console.log('\nORPHANED GENRES (in Work but NOT in Genre table):');
  let orphanCount = 0;
  for (const g of genreCounts) {
    if (!genreValues.has(g.genre)) {
      console.log(`  ⚠️  ${g.genre}: ${g._count._all} works`);
      orphanCount += g._count._all;
    }
  }
  console.log(`  Total orphaned: ${orphanCount}`);
  
  console.log('\nHIDDEN GENRES (in Genre table but showInSidebar=false):');
  let hiddenCount = 0;
  for (const g of genreCounts) {
    if (genreValues.has(g.genre) && !sidebarGenres.has(g.genre)) {
      console.log(`  🔒  ${g.genre}: ${g._count._all} works`);
      hiddenCount += g._count._all;
    }
  }
  console.log(`  Total hidden: ${hiddenCount}`);
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total "Tất cả" shown: ${genreSum}`);
  console.log(`Total visible in sidebar genres: ${genreSum - orphanCount - hiddenCount}`);
  console.log(`Difference: ${genreSum - (genreSum - orphanCount - hiddenCount)} works not assigned to visible categories`);
  
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
