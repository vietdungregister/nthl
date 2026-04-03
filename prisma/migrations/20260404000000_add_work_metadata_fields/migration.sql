-- Migration: add_work_metadata_fields
-- Thêm các fields mới vào bảng Work
-- Các fields này đã được thêm vào local DB qua prisma db push
-- Migration này để server production có thể chạy prisma migrate deploy

ALTER TABLE "Work" ADD COLUMN IF NOT EXISTS "writtenAt" TIMESTAMP(3);
ALTER TABLE "Work" ADD COLUMN IF NOT EXISTS "translations" TEXT;
ALTER TABLE "Work" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Work" ADD COLUMN IF NOT EXISTS "fbTimestamp" INTEGER;
ALTER TABLE "Work" ADD COLUMN IF NOT EXISTS "autoClassified" BOOLEAN NOT NULL DEFAULT false;

-- Index cho writtenAt (dùng trong CMS sort)
CREATE INDEX IF NOT EXISTS "Work_writtenAt_idx" ON "Work"("writtenAt" DESC);
