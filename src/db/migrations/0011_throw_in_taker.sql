ALTER TABLE "goals"
  ADD COLUMN IF NOT EXISTS "throw_in_taker_id" bigint REFERENCES "players"("id");

CREATE INDEX IF NOT EXISTS "idx_goals_throw_in_taker" ON "goals" ("throw_in_taker_id");
