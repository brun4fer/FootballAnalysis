ALTER TABLE "goals"
  ADD COLUMN IF NOT EXISTS "assist_drawing" jsonb;

ALTER TABLE "goals"
  DROP COLUMN IF EXISTS "assist_zone_id";

ALTER TABLE "goals"
  DROP COLUMN IF EXISTS "assist_zone";
