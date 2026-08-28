CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL,
  "slug" varchar(80) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_unique"
  ON "workspaces" ("slug");

CREATE TABLE IF NOT EXISTS "users" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "username" varchar(80) NOT NULL,
  "password_hash" text NOT NULL,
  "workspace_id" bigint NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "must_change_password" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique"
  ON "users" (lower("username"));
CREATE INDEX IF NOT EXISTS "users_workspace_id_idx"
  ON "users" ("workspace_id");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "user_id" bigint NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_hash_unique"
  ON "sessions" ("token_hash");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx"
  ON "sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx"
  ON "sessions" ("expires_at");

INSERT INTO "workspaces" ("name", "slug") VALUES
  ('Paulo', 'paulo'),
  ('Simao', 'simao')
ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name";
