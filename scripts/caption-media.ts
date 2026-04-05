#!/usr/bin/env tsx
/**
 * caption-media.ts — Tự động sinh caption (excerpt) cho ảnh và video
 * =========================================================================
 * - Ảnh (photo):  GPT-4o Vision — đọc file local → base64 → caption tiếng Việt
 * - Video (video): Gemini 2.0 Flash — upload file → caption tiếng Việt
 * - Sau khi caption: tạo ChatChunk + embedding để AI search tìm được
 *
 * Cách chạy:
 *   npx tsx scripts/caption-media.ts             # cả ảnh + video
 *   npx tsx scripts/caption-media.ts --photos    # chỉ ảnh
 *   npx tsx scripts/caption-media.ts --videos    # chỉ video
 *   npx tsx scripts/caption-media.ts --dry-run   # không lưu DB, chỉ test
 *   npx tsx scripts/caption-media.ts --limit 10  # giới hạn số lượng xử lý
 *
 * Chi phí ước tính:
 *   ~470 ảnh × $0.01 = ~$5 (GPT-4o)
 *   ~291 video × $0.03 = ~$9 (Gemini)
 */

import 'dotenv/config'
import * as dotenvLocal from 'dotenv'
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// Load .env.local (ưu tiên hơn .env)
dotenvLocal.config({ path: join(process.cwd(), '.env.local') })
dotenvLocal.config({ path: join(process.cwd(), '.env') })

// ── Config ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const doPhotos = args.includes('--photos') || (!args.includes('--videos'))
const doVideos = args.includes('--videos') || (!args.includes('--photos'))
const dryRun = args.includes('--dry-run')
const limitArg = args.find(a => a.startsWith('--limit'))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf(limitArg) + 1]) : 9999
const CONCURRENCY = 3        // Số lượng xử lý song song
const DELAY_MS = 1000        // Delay giữa các request (tránh rate limit)
const PUBLIC_DIR = join(process.cwd(), 'public')
const LOG_FILE = join(process.cwd(), 'output', 'caption-log.json')

// ── Clients ──────────────────────────────────────────────────────────────────
const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const geminiAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

// ── Prompt ───────────────────────────────────────────────────────────────────
const PHOTO_PROMPT = `Mô tả bức ảnh này bằng tiếng Việt trong 2-4 câu ngắn gọn, súc tích.
Tập trung vào: chủ thể chính, bối cảnh, cảm xúc/không khí, màu sắc nổi bật.
Không dùng từ "bức ảnh" hay "hình ảnh" — mô tả trực tiếp những gì nhìn thấy.
Phong cách: giản dị, thơ mộng, phù hợp với trang văn học.`

const VIDEO_PROMPT = `Mô tả video ngắn này bằng tiếng Việt trong 2-4 câu súc tích.
Tập trung vào: nội dung chính, không khí, chuyển động, cảm xúc truyền tải.
Nếu có người: mô tả hoạt động/biểu cảm, không cần tên.
Phong cách: giản dị, thơ mộng, phù hợp trang văn học.
Không bắt đầu bằng "Video này" hay "Đây là video".`

// ── Helper: sleep ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Caption ảnh với GPT-4o Vision ────────────────────────────────────────────
async function captionPhoto(filePath: string): Promise<string> {
    if (!existsSync(filePath)) {
        throw new Error(`File không tồn tại: ${filePath}`)
    }

    const fileBuffer = readFileSync(filePath)
    const base64 = fileBuffer.toString('base64')
    const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg'
    const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg',
        png: 'image/png', gif: 'image/gif',
        webp: 'image/webp', svg: 'image/svg+xml',
    }
    const mimeType = mimeMap[ext] || 'image/jpeg'

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 300,
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: PHOTO_PROMPT },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'low' } },
            ],
        }],
    })

    return response.choices[0]?.message?.content?.trim() || ''
}

// ── Caption video với Gemini ────────────────────────────────────────────────
async function captionVideo(filePath: string): Promise<string> {
    if (!existsSync(filePath)) {
        throw new Error(`File không tồn tại: ${filePath}`)
    }

    const ext = filePath.split('.').pop()?.toLowerCase() || 'mp4'
    const mimeMap: Record<string, string> = {
        mp4: 'video/mp4', webm: 'video/webm',
        ogg: 'video/ogg', mov: 'video/quicktime',
    }
    const mimeType = mimeMap[ext] || 'video/mp4'

    const fileBuffer = readFileSync(filePath)
    const base64 = fileBuffer.toString('base64')

    const result = await geminiAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [
                { text: VIDEO_PROMPT },
                { inlineData: { mimeType, data: base64 } }
            ]}
        ],
    })

    return (result.text || '').trim()
}

// ── Tạo embedding và ChatChunk ───────────────────────────────────────────────
async function createChunkWithEmbedding(workId: string, text: string): Promise<void> {
    if (!text || text.length < 10) return

    // Tạo embedding
    const embResponse = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
    })
    const embedding = embResponse.data[0].embedding

    // Xóa chunk cũ (nếu có) để tránh duplicate
    await prisma.chatChunk.deleteMany({ where: { workId, content: text } })

    // Tạo chunk mới
    const chunk = await prisma.chatChunk.create({
        data: {
            workId,
            content: text,
            score: 1.0,
            isBlocked: false,
        }
    })

    // Lưu embedding bằng raw SQL (Prisma chưa support pgvector)
    const embStr = '[' + embedding.join(',') + ']'
    await prisma.$executeRawUnsafe(
        `UPDATE "ChatChunk" SET embedding = $1::vector WHERE id = $2`,
        embStr,
        chunk.id
    )
}

// ── Xử lý 1 work ────────────────────────────────────────────────────────────
type WorkResult = { workId: string; title: string; status: 'ok' | 'skip' | 'error'; caption?: string; error?: string }

async function processWork(
    work: { id: string; title: string | null; coverImageUrl: string | null; genre: string },
    type: 'photo' | 'video'
): Promise<WorkResult> {
    const label = work.title?.slice(0, 40) || work.id

    if (!work.coverImageUrl) {
        return { workId: work.id, title: label, status: 'skip' }
    }

    // Resolve đường dẫn file local
    const filePath = join(PUBLIC_DIR, work.coverImageUrl.replace(/^\//, ''))
    if (!existsSync(filePath)) {
        return { workId: work.id, title: label, status: 'skip' }
    }

    try {
        let caption = ''

        if (type === 'photo') {
            caption = await captionPhoto(filePath)
        } else {
            caption = await captionVideo(filePath)
        }

        if (!caption) {
            return { workId: work.id, title: label, status: 'error', error: 'Empty caption' }
        }

        if (!dryRun) {
            // Lưu excerpt
            await prisma.work.update({
                where: { id: work.id },
                data: { excerpt: caption },
            })

            // Tạo ChatChunk + embedding để AI search tìm được
            await createChunkWithEmbedding(work.id, caption)
        }

        return { workId: work.id, title: label, status: 'ok', caption }

    } catch (err: any) {
        return { workId: work.id, title: label, status: 'error', error: err.message }
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('━'.repeat(60))
    console.log('  Caption Media Script')
    console.log('  Photos: GPT-4o Vision | Videos: Gemini 2.0 Flash')
    console.log('━'.repeat(60))
    if (dryRun) console.log('🔍 DRY RUN — không lưu DB\n')
    console.log(`📷 Process photos: ${doPhotos}`)
    console.log(`🎬 Process videos: ${doVideos}`)
    console.log(`🔢 Limit: ${LIMIT}\n`)

    mkdirSync(join(process.cwd(), 'output'), { recursive: true })

    const results: WorkResult[] = []
    let ok = 0, skip = 0, error = 0

    // ── PHOTOS ──────────────────────────────────────────────────────────────
    if (doPhotos) {
        console.log('━'.repeat(40))
        console.log('📷 PHOTOS — GPT-4o Vision')

        const photos = await prisma.work.findMany({
            where: {
                genre: 'photo',
                status: 'published',
                deletedAt: null,
                coverImageUrl: { not: null },
                OR: [{ excerpt: null }, { excerpt: '' }],
            },
            select: { id: true, title: true, coverImageUrl: true, genre: true },
            orderBy: { publishedAt: 'desc' },
            take: LIMIT,
        })

        console.log(`   Tìm thấy ${photos.length} ảnh cần caption\n`)

        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i]
            process.stdout.write(`   [${i + 1}/${photos.length}] ${photo.title?.slice(0, 35) || photo.id}... `)

            const result = await processWork(photo, 'photo')
            results.push(result)

            if (result.status === 'ok') {
                ok++
                console.log(`✅ ${result.caption?.slice(0, 60)}...`)
            } else if (result.status === 'skip') {
                skip++
                console.log('⏭️  skip (no file)')
            } else {
                error++
                console.log(`❌ ${result.error}`)
            }

            if (i < photos.length - 1) await sleep(DELAY_MS)
        }
    }

    // ── VIDEOS ──────────────────────────────────────────────────────────────
    if (doVideos) {
        console.log('\n' + '━'.repeat(40))
        console.log('🎬 VIDEOS — Gemini 2.0 Flash')

        const videos = await prisma.work.findMany({
            where: {
                genre: 'video',
                status: 'published',
                deletedAt: null,
                coverImageUrl: { not: null },
                OR: [{ excerpt: null }, { excerpt: '' }],
            },
            select: { id: true, title: true, coverImageUrl: true, genre: true },
            orderBy: { publishedAt: 'desc' },
            take: LIMIT,
        })

        console.log(`   Tìm thấy ${videos.length} video cần caption\n`)

        for (let i = 0; i < videos.length; i++) {
            const video = videos[i]
            process.stdout.write(`   [${i + 1}/${videos.length}] ${video.title?.slice(0, 35) || video.id}... `)

            const result = await processWork(video, 'video')
            results.push(result)

            if (result.status === 'ok') {
                ok++
                console.log(`✅ ${result.caption?.slice(0, 60)}...`)
            } else if (result.status === 'skip') {
                skip++
                console.log('⏭️  skip (no file)')
            } else {
                error++
                console.log(`❌ ${result.error}`)
            }

            if (i < videos.length - 1) await sleep(DELAY_MS * 2)  // Gemini cần thêm thời gian
        }
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('\n' + '━'.repeat(60))
    console.log('✅ HOÀN THÀNH')
    console.log(`   ✅ Thành công : ${ok}`)
    console.log(`   ⏭️  Skip       : ${skip}`)
    console.log(`   ❌ Lỗi        : ${error}`)

    if (!dryRun) {
        console.log(`\n   💾 Log đã lưu: ${LOG_FILE}`)
        writeFileSync(LOG_FILE, JSON.stringify(results, null, 2))
    }

    await prisma.$disconnect()
}

main().catch(async e => {
    console.error('❌ Fatal error:', e)
    await prisma.$disconnect()
    process.exit(1)
})
