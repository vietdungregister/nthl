#!/usr/bin/env ts-node
/**
 * fix-vn-spacing.ts
 *
 * Data migration script: fix Vietnamese syllables split by spaces in crawled data.
 * Uses GPT-4o-mini for high-accuracy fixes, with regex as pre-flight filter.
 *
 * Usage:
 *   # Dry run (print diffs only):
 *   npx ts-node --project tsconfig.scripts.json scripts/fix-vn-spacing.ts
 *
 *   # Apply fixes to DB:
 *   DRY_RUN=false npx ts-node --project tsconfig.scripts.json scripts/fix-vn-spacing.ts
 *
 *   # Only fix titles (faster, fewer tokens):
 *   MODE=titles npx ts-node --project tsconfig.scripts.json scripts/fix-vn-spacing.ts
 */

import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const DRY_RUN = process.env.DRY_RUN !== 'false'
const MODE = process.env.MODE ?? 'titles' // 'titles' | 'all'
const BATCH_SIZE = 15
const DELAY_MS = 500 // rate-limit buffer

// Vietnamese diacritics for regex detection
const VN = 'àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ'

/**
 * Detect if text likely has split Vietnamese words.
 * Heuristic: VN char + single space + short letter sequence
 */
function hasSplitVN(text: string): boolean {
  // Pattern: Vietnamese char followed by space then 1-2 chars before space/end
  const re = new RegExp(`[${VN}] [a-zA-Z${VN}]{1,2}(?= |,|\\.|$)`)
  return re.test(text)
}

async function fixWithGPT(texts: string[]): Promise<string[]> {
  const joined = texts.map((t, i) => `${i + 1}. ${t}`).join('\n')
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 2000,
    messages: [
      {
        role: 'system',
        content: `Bạn là công cụ sửa lỗi chính tả tiếng Việt do crawl web.
Dữ liệu crawl hay bị tách từ: "CHUYỆ N CỦ A" → "CHUYỆN CỦA", "th iên" → "thiên".
Sửa CHÍNH XÁC lỗi tách từ. KHÔNG thay đổi nội dung khác. KHÔNG thêm giải thích.
Trả về danh sách đánh số giống input, mỗi dòng là 1 entry đã sửa.`
      },
      { role: 'user', content: joined }
    ]
  })

  const raw = res.choices[0].message.content ?? ''
  const lines = raw.split('\n').filter(l => /^\d+\./.test(l))
  return lines.map(l => l.replace(/^\d+\.\s*/, '').trim())
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  console.log(`\n🔍 Scanning works for split Vietnamese text...`)
  console.log(`   Mode: ${MODE} | Dry run: ${DRY_RUN}\n`)

  // Query works with suspicious titles
  const works = await prisma.work.findMany({
    where: { status: 'published', deletedAt: null },
    select: { id: true, title: true, content: true },
    orderBy: { publishedAt: 'desc' },
  })

  const toFix: { id: string; title: string; oldContent?: string }[] = []

  for (const w of works) {
    if (hasSplitVN(w.title)) {
      toFix.push({ id: w.id, title: w.title })
    }
  }

  console.log(`📋 Found ${toFix.length} works with suspicious titles out of ${works.length} total`)

  if (toFix.length === 0) {
    console.log('✅ No fixes needed!')
    return
  }

  let fixed = 0
  let errors = 0

  // Process in batches
  for (let i = 0; i < toFix.length; i += BATCH_SIZE) {
    const batch = toFix.slice(i, i + BATCH_SIZE)
    const titles = batch.map(w => w.title)

    console.log(`\n⚙️  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toFix.length / BATCH_SIZE)} (${batch.length} items)`)

    try {
      const fixedTitles = await fixWithGPT(titles)

      for (let j = 0; j < batch.length; j++) {
        const original = batch[j].title
        const corrected = fixedTitles[j] ?? original

        if (original !== corrected) {
          console.log(`  ✏️  "${original}"`)
          console.log(`    → "${corrected}"`)

          if (!DRY_RUN) {
            await prisma.work.update({
              where: { id: batch[j].id },
              data: { title: corrected }
            })
          }
          fixed++
        }
      }

      await sleep(DELAY_MS)
    } catch (err) {
      console.error(`  ❌ Batch error:`, err)
      errors++
    }
  }

  console.log(`\n✅ Done! Fixed: ${fixed} | Errors: ${errors} | Dry run: ${DRY_RUN}`)
  if (DRY_RUN) {
    console.log(`\n💡 To apply: DRY_RUN=false npx ts-node scripts/fix-vn-spacing.ts`)
  }

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
