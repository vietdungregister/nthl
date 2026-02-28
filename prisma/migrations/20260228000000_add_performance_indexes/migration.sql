-- Migration: add_performance_indexes
-- Mục đích: tối ưu hiệu suất cho 10,000+ tác phẩm
-- Tác động: giảm từ O(n) full table scan xuống O(log n) với index

-- ============================================================
-- 1. B-tree composite indexes cho filter + sort thường gặp
-- ============================================================

-- Trang chủ + danh sách: WHERE status='published' AND deletedAt IS NULL ORDER BY publishedAt DESC
CREATE INDEX IF NOT EXISTS "Work_status_deletedAt_publishedAt_idx"
  ON "Work"(status, "deletedAt", "publishedAt" DESC);

-- Filter theo thể loại: WHERE genre=? AND status='published' AND deletedAt IS NULL
CREATE INDEX IF NOT EXISTS "Work_genre_status_deletedAt_idx"
  ON "Work"(genre, status, "deletedAt");

-- Tác phẩm nổi bật theo ngày: WHERE featuredDate BETWEEN ? AND ? AND status='published'
CREATE INDEX IF NOT EXISTS "Work_featuredDate_status_deletedAt_idx"
  ON "Work"("featuredDate", status, "deletedAt");

-- CMS dashboard + sort mới nhất: ORDER BY createdAt DESC
CREATE INDEX IF NOT EXISTS "Work_createdAt_idx"
  ON "Work"("createdAt" DESC);

-- Dashboard COUNT theo status: WHERE deletedAt IS NULL GROUP BY status
CREATE INDEX IF NOT EXISTS "Work_deletedAt_status_idx"
  ON "Work"("deletedAt", status);

-- ============================================================
-- 2. GIN index cho PostgreSQL Full-Text Search
-- ============================================================
-- Thay thế LIKE '%query%' (O(n) scan) bằng tsvector (O(log n))
-- Đặc biệt quan trọng với content field 3-4GB tổng dung lượng
-- 'simple' dictionary: không stemming, phù hợp tiếng Việt có dấu
-- ============================================================

CREATE INDEX IF NOT EXISTS "Work_fts_gin_idx"
  ON "Work" USING GIN (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(excerpt, '') || ' ' ||
      coalesce(content, '')
    )
  );

-- ============================================================
-- Ước tính thời gian tạo index trên production:
-- B-tree indexes: ~1-2 phút cho 10k rows (không lock table lâu)
-- GIN index (content): ~5-10 phút cho 10k rows × avg content size
-- Khuyến nghị: chạy trong giờ thấp điểm hoặc dùng CONCURRENTLY:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Work_fts_gin_idx" ...
-- ============================================================
