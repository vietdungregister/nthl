/**
 * health-check.js — Kiểm tra kết nối môi trường trước khi deploy
 * Chạy bằng: node health-check.js
 *
 * ✅ [OK]      — biến có giá trị và kết nối thành công
 * ❌ [MISSING] — biến chưa được set
 * ⚠️  [WARN]   — biến có giá trị nhưng có vấn đề cần chú ý
 * ✗  [FAIL]   — không kết nối được
 */

require('dotenv').config()
require('dotenv').config({ path: '.env.local', override: false })

const https = require('https')
const path = require('path')
const fs = require('fs')

let passed = 0
let failed = 0
let warnings = 0

function ok(label, detail = '') {
    console.log(`  ✅ [OK]      ${label}${detail ? '  →  ' + detail : ''}`)
    passed++
}
function missing(label, hint = '') {
    console.log(`  ❌ [MISSING] ${label}${hint ? `  (${hint})` : ''}`)
    failed++
}
function warn(label, detail = '') {
    console.log(`  ⚠️  [WARN]   ${label}${detail ? '  →  ' + detail : ''}`)
    warnings++
}
function fail(label, detail = '') {
    console.log(`  ✗  [FAIL]   ${label}${detail ? '  →  ' + detail : ''}`)
    failed++
}
function section(title) {
    console.log(`\n${'─'.repeat(56)}`)
    console.log(`  ${title}`)
    console.log('─'.repeat(56))
}
function maskSecret(val) {
    if (!val || val.length < 8) return '[SET]'
    return val.slice(0, 6) + '...' + val.slice(-4)
}

async function main() {
    console.log('\n🔍 Health Check — ' + new Date().toLocaleString('vi-VN'))

    // ============================================================
    // 1. BIẾN MÔI TRƯỜNG
    // ============================================================
    section('1. Environment Variables')

    // DATABASE_URL
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
        missing('DATABASE_URL')
    } else {
        if (dbUrl.startsWith('file:')) ok('DATABASE_URL', `SQLite → ${dbUrl}`)
        else if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))
            ok('DATABASE_URL', `PostgreSQL (${dbUrl.split('@')[1]?.split('/')[0] || 'remote'})`)
        else warn('DATABASE_URL', `Unknown format`)
    }

    // NEXTAUTH_SECRET
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
        missing('NEXTAUTH_SECRET', 'generate: openssl rand -base64 64')
    } else if (secret.length < 32) {
        warn('NEXTAUTH_SECRET', `Quá ngắn (${secret.length} chars, nên ≥ 64)`)
    } else if (/secret|change|your/i.test(secret)) {
        warn('NEXTAUTH_SECRET', 'Có vẻ là giá trị mặc định, cần đổi trong production')
    } else {
        ok('NEXTAUTH_SECRET', `${maskSecret(secret)} (${secret.length} chars)`)
    }

    // NEXTAUTH_URL
    const authUrl = process.env.NEXTAUTH_URL
    if (!authUrl) {
        missing('NEXTAUTH_URL', 'ví dụ: https://your-domain.com')
    } else if (authUrl.includes('localhost')) {
        warn('NEXTAUTH_URL', `${authUrl}  ← đổi sang domain thật khi deploy lên production`)
    } else {
        ok('NEXTAUTH_URL', authUrl)
    }

    // ADMIN_EMAIL
    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) {
        missing('ADMIN_EMAIL', 'dùng khi chạy prisma db seed')
    } else {
        ok('ADMIN_EMAIL', adminEmail.replace(/(.{2}).*(@.*)/, '$1***$2'))
    }

    // ADMIN_PASSWORD
    const adminPass = process.env.ADMIN_PASSWORD
    if (!adminPass) {
        missing('ADMIN_PASSWORD', 'dùng khi chạy prisma db seed')
    } else if (adminPass.length < 12 || !adminPass.match(/[^a-zA-Z0-9]/)) {
        warn('ADMIN_PASSWORD', `Nên ≥ 12 ký tự và có ký tự đặc biệt`)
    } else {
        ok('ADMIN_PASSWORD', `[SET] (${adminPass.length} chars)`)
    }

    // OPENAI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
        missing('OPENAI_API_KEY', 'Thủ Thư AI sẽ không hoạt động')
    } else if (!openaiKey.startsWith('sk-')) {
        warn('OPENAI_API_KEY', 'Format không hợp lệ — phải bắt đầu bằng "sk-"')
    } else {
        ok('OPENAI_API_KEY', maskSecret(openaiKey))
    }

    // ============================================================
    // 2. KẾT NỐI DATABASE
    // ============================================================
    section('2. Database Connection')

    const dbUrlCheck = process.env.DATABASE_URL || ''
    if (dbUrlCheck.startsWith('file:')) {
        const dbPath = dbUrlCheck.replace('file:', '').replace('./', '')
        const fullPath = path.resolve(process.cwd(), dbPath)
        if (fs.existsSync(fullPath)) {
            const stat = fs.statSync(fullPath)
            ok('SQLite file exists', `${fullPath} (${(stat.size / 1024).toFixed(1)} KB)`)
        } else {
            fail('SQLite file not found', `${fullPath}  →  chạy: npx prisma db push`)
        }

        try {
            const { PrismaClient } = require('@prisma/client')
            const prisma = new PrismaClient({ log: [] })
            await prisma.$connect()
            const count = await prisma.work.count()
            await prisma.$disconnect()
            ok('Prisma → SQLite query OK', `${count} works in DB`)
        } catch (e) {
            fail('Prisma → SQLite query failed', String(e.message).slice(0, 80))
        }
    } else if (dbUrlCheck.startsWith('postgresql://') || dbUrlCheck.startsWith('postgres://')) {
        try {
            const { PrismaClient } = require('@prisma/client')
            const prisma = new PrismaClient({ log: [] })
            await prisma.$connect()
            const count = await prisma.work.count()
            await prisma.$disconnect()
            ok('PostgreSQL connection OK', `${count} works in DB`)
        } catch (e) {
            fail('PostgreSQL connection failed', String(e.message).slice(0, 80))
        }
    } else {
        warn('Database check skipped', 'DATABASE_URL missing')
    }

    // ============================================================
    // 3. OPENAI API
    // ============================================================
    section('3. OpenAI API')

    const oaiKey = process.env.OPENAI_API_KEY
    if (!oaiKey || !oaiKey.startsWith('sk-')) {
        warn('OpenAI check skipped', 'OPENAI_API_KEY missing hoặc invalid format')
    } else {
        await new Promise((resolve) => {
            const req = https.request({
                hostname: 'api.openai.com',
                path: '/v1/models',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${oaiKey}` },
            }, (res) => {
                // Drain response body
                res.resume()
                if (res.statusCode === 200) {
                    ok('OpenAI API reachable', `HTTP 200 — Key hợp lệ ✓`)
                } else if (res.statusCode === 401) {
                    fail('OpenAI API key invalid', `HTTP 401 — Key không hợp lệ hoặc đã bị revoke`)
                } else if (res.statusCode === 429) {
                    warn('OpenAI API rate limited', `HTTP 429 — Key OK nhưng đang bị throttle`)
                } else {
                    warn('OpenAI API unexpected', `HTTP ${res.statusCode}`)
                }
                resolve()
            })
            req.on('error', (e) => { fail('OpenAI API unreachable', `Network: ${e.message}`); resolve() })
            req.setTimeout(10000, () => { fail('OpenAI API timeout', '> 10s'); req.destroy(); resolve() })
            req.end()
        })
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    section('Summary')
    console.log(`  ✅ Passed   : ${passed}`)
    console.log(`  ⚠️  Warnings : ${warnings}`)
    console.log(`  ❌ Failed   : ${failed}`)
    console.log()

    if (failed > 0) {
        console.log('  🚫 KHÔNG SẴN SÀNG DEPLOY — Fix các lỗi [MISSING] và [FAIL] trước.\n')
        process.exit(1)
    } else if (warnings > 0) {
        console.log('  ⚠️  CÓ THỂ DEPLOY — Xem lại các [WARN] trước khi lên production.\n')
        process.exit(0)
    } else {
        console.log('  🚀 SẴN SÀNG DEPLOY!\n')
        process.exit(0)
    }
}

main().catch(e => {
    console.error('\n❌ Lỗi khi chạy health-check:', e.message)
    process.exit(1)
})
