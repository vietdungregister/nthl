/**
 * Revalidate Next.js cache cho genres và genre-counts
 * Gọi internal API để clear cache sau khi thay đổi DB
 */
const http = require('http');

const tags = ['genres', 'genre-counts'];

async function revalidateTag(tag) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/revalidate?tag=${tag}&secret=internal`,
      method: 'GET',
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ tag, status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Revalidating cache tags...');
  for (const tag of tags) {
    try {
      const result = await revalidateTag(tag);
      console.log(`  ✅ ${tag}: ${result.status} ${result.data}`);
    } catch (e) {
      console.log(`  ⚠️  ${tag}: ${e.message} (server có thể chưa chạy)`);
    }
  }
}

main();
