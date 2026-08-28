ALTER TABLE "seasons" ADD COLUMN IF NOT EXISTS "workspace_id" bigint;
ALTER TABLE "championships" ADD COLUMN IF NOT EXISTS "workspace_id" bigint;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "workspace_id" bigint;

UPDATE "seasons"
SET "workspace_id" = CASE
  WHEN "name" = '2025/2026' THEN (SELECT "id" FROM "workspaces" WHERE "slug" = 'paulo')
  WHEN "name" = '2026/27' THEN (SELECT "id" FROM "workspaces" WHERE "slug" = 'simao')
  ELSE "workspace_id"
END
WHERE "workspace_id" IS NULL;

UPDATE "championships" c
SET "workspace_id" = s."workspace_id"
FROM "seasons" s
WHERE c."season_id" = s."id" AND c."workspace_id" IS NULL;

UPDATE "teams" t
SET "workspace_id" = c."workspace_id"
FROM "championships" c
WHERE t."championship_id" = c."id" AND t."workspace_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "seasons" WHERE "workspace_id" IS NULL) THEN
    RAISE EXCEPTION 'Unclassified seasons exist; workspace migration cancelled';
  END IF;
  IF EXISTS (SELECT 1 FROM "championships" WHERE "workspace_id" IS NULL) THEN
    RAISE EXCEPTION 'Unclassified championships exist; workspace migration cancelled';
  END IF;
  IF EXISTS (SELECT 1 FROM "teams" WHERE "workspace_id" IS NULL) THEN
    RAISE EXCEPTION 'Unclassified teams exist; workspace migration cancelled';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "championships" c
    JOIN "seasons" s ON s."id" = c."season_id"
    WHERE c."workspace_id" <> s."workspace_id"
  ) THEN
    RAISE EXCEPTION 'Championship and season workspace mismatch';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "teams" t
    JOIN "championships" c ON c."id" = t."championship_id"
    WHERE t."workspace_id" <> c."workspace_id"
  ) THEN
    RAISE EXCEPTION 'Team and championship workspace mismatch';
  END IF;
END $$;

ALTER TABLE "seasons" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "championships" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "teams" ALTER COLUMN "workspace_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seasons_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE "seasons" ADD CONSTRAINT "seasons_workspace_id_workspaces_id_fk"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'championships_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE "championships" ADD CONSTRAINT "championships_workspace_id_workspaces_id_fk"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_workspaces_id_fk"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "seasons" DROP CONSTRAINT IF EXISTS "seasons_name_unique";
DROP INDEX IF EXISTS "teams_name_key";

CREATE INDEX IF NOT EXISTS "idx_seasons_workspace" ON "seasons" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_championships_workspace" ON "championships" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_teams_workspace" ON "teams" ("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "seasons_name_workspace_unique"
  ON "seasons" ("name", "workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "teams_name_workspace_unique"
  ON "teams" ("name", "workspace_id");
