BEGIN;

ALTER TABLE "goals"
  ADD COLUMN IF NOT EXISTS "matchday" smallint,
  ADD COLUMN IF NOT EXISTS "match_date" date,
  ADD COLUMN IF NOT EXISTS "team_venue" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_matchday_check'
  ) THEN
    ALTER TABLE "goals"
      ADD CONSTRAINT "goals_matchday_check"
      CHECK ("matchday" IS NULL OR "matchday" BETWEEN 1 AND 99);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_team_venue_check'
  ) THEN
    ALTER TABLE "goals"
      ADD CONSTRAINT "goals_team_venue_check"
      CHECK ("team_venue" IS NULL OR "team_venue" IN ('home', 'away'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_goals_match_context"
  ON "goals" ("team_id", "match_date", "matchday", "opponent_team_id");

COMMIT;
