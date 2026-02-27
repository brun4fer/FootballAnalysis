ALTER TABLE "goals"
  ADD COLUMN IF NOT EXISTS "reference_player_id" bigint REFERENCES "players"("id");

CREATE INDEX IF NOT EXISTS "idx_goals_reference_player" ON "goals" ("reference_player_id");
