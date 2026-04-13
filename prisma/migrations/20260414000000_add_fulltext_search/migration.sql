-- Enable extensions
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create IMMUTABLE wrapper for unaccent (required for use in indexes)
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$
  SELECT unaccent($1)
$$;

-- Add search_vector column (managed by trigger)
ALTER TABLE "Work" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Populate search_vector for existing rows
-- Weight A = title (highest priority), Weight B = content
UPDATE "Work" SET "searchVector" =
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(title, ''))), 'A') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(content, ''))), 'B')
WHERE "searchVector" IS NULL;

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "Work_searchVector_idx"
  ON "Work" USING GIN ("searchVector");

-- Trigram index on title for fuzzy matching (using IMMUTABLE wrapper)
CREATE INDEX IF NOT EXISTS "Work_title_trgm_idx"
  ON "Work" USING GIN (immutable_unaccent(lower(title)) gin_trgm_ops);

-- Trigger function: auto-update searchVector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_work_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(NEW.content, ''))), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS work_search_vector_trigger ON "Work";
CREATE TRIGGER work_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, content ON "Work"
  FOR EACH ROW EXECUTE FUNCTION update_work_search_vector();
