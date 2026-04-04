-- Migration: add_hnsw_embedding_index
-- Mục đích: tối ưu vector search tốc độ (~330x nhanh hơn)
-- Trước: Sequential scan 133K rows → ~19s
-- Sau:   HNSW index scan → ~58ms
--
-- Lý do dùng halfvec thay vì vector:
--   pgvector giới hạn HNSW/IVFFlat index tối đa 2000 dims
--   text-embedding-3-large dùng 3072 dims → phải cast sang halfvec(3072)
--   halfvec hỗ trợ lên đến 4000 dims với HNSW
--
-- Thời gian tạo index: ~5-15 phút cho 133K rows (không block reads/writes)
-- Dùng CONCURRENTLY để không lock table

-- Tăng maintenance memory để build nhanh hơn
-- (chạy riêng nếu có quyền superuser)
-- ALTER SYSTEM SET maintenance_work_mem = '512MB';
-- SELECT pg_reload_conf();

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ChatChunk_embedding_hnsw_idx"
ON "ChatChunk" USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops)
WITH (m = 16, ef_construction = 64);
