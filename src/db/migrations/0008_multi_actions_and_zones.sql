-- Multi-actions + zone/phase metadata for radiografia ofensiva
CREATE TABLE IF NOT EXISTS "goal_actions" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "goal_id" bigint NOT NULL REFERENCES "goals"("id") ON DELETE cascade,
  "action_id" bigint NOT NULL REFERENCES "actions"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "goal_actions_goal_action_key" ON "goal_actions" ("goal_id", "action_id");
CREATE INDEX IF NOT EXISTS "idx_goal_actions_goal" ON "goal_actions" ("goal_id");
CREATE INDEX IF NOT EXISTS "idx_goal_actions_action" ON "goal_actions" ("action_id");

ALTER TABLE "goals"
  ADD COLUMN IF NOT EXISTS "assist_coordinates" jsonb,
  ADD COLUMN IF NOT EXISTS "assist_sector" text,
  ADD COLUMN IF NOT EXISTS "shot_sector" text,
  ADD COLUMN IF NOT EXISTS "finish_sector" text,
  ADD COLUMN IF NOT EXISTS "build_up_phase" text,
  ADD COLUMN IF NOT EXISTS "creation_phase" text,
  ADD COLUMN IF NOT EXISTS "finalization_phase" text,
  ADD COLUMN IF NOT EXISTS "corner_profile" text,
  ADD COLUMN IF NOT EXISTS "freekick_profile" text,
  ADD COLUMN IF NOT EXISTS "throw_in_profile" text,
  ADD COLUMN IF NOT EXISTS "goalkeeper_outlet" text;

ALTER TABLE "goals" DROP CONSTRAINT IF EXISTS "goals_corner_profile_check";
ALTER TABLE "goals" ADD CONSTRAINT "goals_corner_profile_check" CHECK (
  corner_profile IS NULL OR corner_profile IN ('fechado','aberto','combinado')
);

ALTER TABLE "goals" DROP CONSTRAINT IF EXISTS "goals_freekick_profile_check";
ALTER TABLE "goals" ADD CONSTRAINT "goals_freekick_profile_check" CHECK (
  freekick_profile IS NULL OR freekick_profile IN ('fechado','aberto','combinado')
);

ALTER TABLE "goals" DROP CONSTRAINT IF EXISTS "goals_throw_in_profile_check";
ALTER TABLE "goals" ADD CONSTRAINT "goals_throw_in_profile_check" CHECK (
  throw_in_profile IS NULL OR throw_in_profile IN ('area','organizacao')
);

ALTER TABLE "goals" DROP CONSTRAINT IF EXISTS "goals_goalkeeper_outlet_check";
ALTER TABLE "goals" ADD CONSTRAINT "goals_goalkeeper_outlet_check" CHECK (
  goalkeeper_outlet IS NULL OR goalkeeper_outlet IN ('curto_para_longo','bola_longa')
);

-- Seed goal_actions from legacy single action_id
INSERT INTO "goal_actions" ("goal_id", "action_id")
SELECT id, action_id FROM "goals" WHERE action_id IS NOT NULL
ON CONFLICT DO NOTHING;
