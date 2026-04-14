const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
p.genre.updateMany({ where: { value: { in: ['photo', 'video'] } }, data: { showInSidebar: true } })
    .then(r => { console.log('Updated', r.count, 'genres'); return p.$disconnect() })
