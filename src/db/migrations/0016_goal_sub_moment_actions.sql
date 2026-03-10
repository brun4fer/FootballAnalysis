CREATE TABLE IF NOT EXISTS "goal_sub_moment_actions" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "goal_id" bigint NOT NULL REFERENCES "goals"("id") ON DELETE CASCADE,
  "sub_moment_id" bigint NOT NULL REFERENCES "sub_moments"("id") ON DELETE CASCADE,
  "action_id" bigint NOT NULL REFERENCES "actions"("id") ON DELETE CASCADE,
  "sequence_order" integer NOT NULL,
  CONSTRAINT "goal_sub_moment_actions_sequence_order_check" CHECK ("sequence_order" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "goal_sub_moment_actions_goal_sequence_key"
  ON "goal_sub_moment_actions" ("goal_id", "sequence_order");
CREATE UNIQUE INDEX IF NOT EXISTS "goal_sub_moment_actions_goal_sub_moment_key"
  ON "goal_sub_moment_actions" ("goal_id", "sub_moment_id");
CREATE INDEX IF NOT EXISTS "idx_goal_sub_moment_actions_goal"
  ON "goal_sub_moment_actions" ("goal_id");
CREATE INDEX IF NOT EXISTS "idx_goal_sub_moment_actions_sub_moment"
  ON "goal_sub_moment_actions" ("sub_moment_id");
CREATE INDEX IF NOT EXISTS "idx_goal_sub_moment_actions_action"
  ON "goal_sub_moment_actions" ("action_id");

INSERT INTO "goal_sub_moment_actions" ("goal_id", "sub_moment_id", "action_id", "sequence_order")
SELECT g."id", g."sub_moment_id", g."action_id", 1
FROM "goals" g
WHERE g."sub_moment_id" IS NOT NULL
  AND g."action_id" IS NOT NULL
ON CONFLICT ("goal_id", "sequence_order") DO NOTHING;

