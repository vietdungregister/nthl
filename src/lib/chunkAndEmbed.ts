/**
 * lib/chunkAndEmbed.ts
 * Tự động tạo ChatChunk + vector embedding khi Work được tạo hoặc cập nhật.
 * Được gọi trong `after()` (ngoài response) để không block user.
 */

import OpenAI from 'openai'
import { prisma } from '@/lib/db'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const EMBED_MODEL = 'text-embedding-3-large'
const MAX_CHUNK_LEN = 800   // ký tự tối đa mỗi chunk
const MIN_CHUNK_LEN = 10    // bỏ qua dòng quá ngắn

/**
 * Tách nội dung thành các chunks ngắn theo đoạn/dòng.
 */
function splitIntoChunks(content: string): string[] {
    // Tách theo đoạn văn (2+ newline), sau đó theo dòng nếu vẫn quá dài
    const paragraphs = content.split(/\n{2,}/).flatMap(para => {
        if (para.length <= MAX_CHUNK_LEN) return [para]
        // Đoạn dài → tách theo từng dòng
        return para.split('\n')
    })

    return paragraphs
        .map(p => p.trim())
        .filter(p => p.length >= MIN_CHUNK_LEN)
}

/**
 * Tạo chunks + embedding cho một work.
 * Xóa chunks cũ trước khi tạo mới.
 */
export async function chunkAndEmbed(workId: string, content: string): Promise<void> {
    if (!content?.trim()) return

    const chunks = splitIntoChunks(content)
    if (chunks.length === 0) return

    console.log(`[chunkAndEmbed] work=${workId} → ${chunks.length} chunks`)

    // Xóa chunks cũ
    await prisma.chatChunk.deleteMany({ where: { workId } })

    // Tạo embedding từng batch (OpenAI limit: 2048 input/call, an toàn dùng 100)
    const BATCH = 50
    const allChunks: { content: string; embedding: number[] }[] = []

    for (let i = 0; i < chunks.length; i += BATCH) {
        const batch = chunks.slice(i, i + BATCH)
        try {
            const resp = await openai.embeddings.create({
                model: EMBED_MODEL,
                input: batch,
            })
            batch.forEach((text, j) => {
                allChunks.push({ content: text, embedding: resp.data[j].embedding })
            })
        } catch (err) {
            console.error(`[chunkAndEmbed] embedding error (batch ${i}):`, err)
            // Lưu chunk không có embedding để text search vẫn hoạt động
            batch.forEach(text => allChunks.push({ content: text, embedding: [] }))
        }
    }

    // Insert tất cả chunks vào DB
    // Dùng $transaction để atomic
    await prisma.$transaction(
        allChunks.map((chunk, idx) => {
            const embStr = chunk.embedding.length > 0
                ? `[${chunk.embedding.join(',')}]`
                : null

            return prisma.$executeRawUnsafe(
                `INSERT INTO "ChatChunk" (id, "workId", content, embedding, score, "isBlocked", "createdAt", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, ${embStr ? `$3::vector` : 'NULL'}, $4, false, NOW(), NOW())`,
                ...(embStr
                    ? [workId, chunk.content, embStr, idx === 0 ? 1 : 0]
                    : [workId, chunk.content, idx === 0 ? 1 : 0])
            )
        })
    )

    console.log(`[chunkAndEmbed] ✅ work=${workId} → ${allChunks.length} chunks saved`)
}
