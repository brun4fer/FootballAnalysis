ALTER TABLE "goals"
  ADD COLUMN IF NOT EXISTS "foul_suffered_by_id" bigint REFERENCES "players"("id"),
  ADD COLUMN IF NOT EXISTS "previous_moment_description" text;

CREATE INDEX IF NOT EXISTS "idx_goals_foul_suffered_by" ON "goals" ("foul_suffered_by_id");
