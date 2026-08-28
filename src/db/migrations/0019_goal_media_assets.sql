ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "media_asset_id" text;

CREATE INDEX IF NOT EXISTS "idx_goals_media_asset"
  ON "goals" ("media_asset_id");
