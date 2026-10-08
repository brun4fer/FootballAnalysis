BEGIN;

ALTER TABLE "sub_moments" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "sub_moments" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY moment_id
      ORDER BY
        CASE
          WHEN lower(name) LIKE '%saída do gr%' OR lower(name) LIKE '%saida do gr%' THEN 1
          WHEN lower(name) LIKE '%construção%' OR lower(name) LIKE '%construcao%' THEN 2
          WHEN lower(name) LIKE '%criação%' OR lower(name) LIKE '%criacao%' THEN 3
          WHEN lower(name) LIKE '%finalização%' OR lower(name) LIKE '%finalizacao%' THEN 4
          WHEN lower(name) LIKE '%defensivo%' THEN 1
          WHEN lower(name) LIKE '%ofensivo%' THEN 2
          ELSE 100
        END,
        id
    ) AS position
  FROM "sub_moments"
)
UPDATE "sub_moments" sm
SET "sort_order" = ranked.position
FROM ranked
WHERE ranked.id = sm.id AND sm."sort_order" = 0;

ALTER TABLE "goals" ALTER COLUMN "action_id" DROP NOT NULL;
ALTER TABLE "goals" ALTER COLUMN "sub_moment_id" DROP NOT NULL;

DROP INDEX IF EXISTS "goal_sub_moment_actions_goal_sequence_key";
DROP INDEX IF EXISTS "goal_sub_moment_actions_goal_sub_moment_key";
CREATE UNIQUE INDEX IF NOT EXISTS "goal_sub_moment_actions_goal_sub_moment_action_key"
  ON "goal_sub_moment_actions" ("goal_id", "sub_moment_id", "action_id");
CREATE INDEX IF NOT EXISTS "idx_goal_sub_moment_actions_goal_sequence"
  ON "goal_sub_moment_actions" ("goal_id", "sequence_order");

COMMIT;
