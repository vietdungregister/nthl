const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
    const hash = await bcrypt.hash('admin', 10);
    const r = await p.adminUser.updateMany({
        data: { passwordHash: hash, loginAttempts: 0, lockUntil: null }
    });
    console.log('Updated', r.count, 'admin(s).');
    console.log('Login: admin@admin.com / admin');
    await p.$disconnect();
})();
