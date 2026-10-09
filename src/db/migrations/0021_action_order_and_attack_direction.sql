BEGIN;

ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY sub_moment_id ORDER BY id) AS position
  FROM "actions"
)
UPDATE "actions" a
SET "sort_order" = ranked.position
FROM ranked
WHERE ranked.id = a.id AND a."sort_order" = 0;

ALTER TABLE "goals"
  ADD COLUMN IF NOT EXISTS "attack_direction" text NOT NULL DEFAULT 'left_to_right';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_attack_direction_check'
  ) THEN
    ALTER TABLE "goals"
      ADD CONSTRAINT "goals_attack_direction_check"
      CHECK ("attack_direction" IN ('left_to_right', 'right_to_left'));
  END IF;
END $$;

COMMIT;
