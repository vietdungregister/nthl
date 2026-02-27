const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const p = new PrismaClient()
bcrypt.hash('Nh@THL!2026#Secure$Admin', 12).then(h =>
    p.adminUser.updateMany({ data: { passwordHash: h } })
).then(r => {
    console.log('✅ Updated', r.count, 'admin user(s) with new password hash')
    return p.$disconnect()
}).catch(e => { console.error(e); process.exit(1) })
