CREATE TABLE "actions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sub_moment_id" bigint NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "championships" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"season_id" bigint NOT NULL,
	"country" text NOT NULL,
	"name" text NOT NULL,
	"logo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_involvements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"goal_id" bigint NOT NULL,
	"player_id" bigint NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "goal_involvements_role_check" CHECK (role IN ('assist','involvement'))
);
--> statement-breakpoint
CREATE TABLE "goalkeeper_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "goalkeeper_zones_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"match_id" bigint,
	"team_id" bigint NOT NULL,
	"scorer_id" bigint NOT NULL,
	"minute" smallint NOT NULL,
	"moment_id" bigint NOT NULL,
	"sub_moment_id" bigint NOT NULL,
	"action_id" bigint NOT NULL,
	"goal_zone_id" smallint NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_minute_check" CHECK ("goals"."minute" BETWEEN 0 AND 130)
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"championship_id" bigint,
	"home_team_id" bigint,
	"away_team_id" bigint,
	"match_date" date,
	"venue" text
);
--> statement-breakpoint
CREATE TABLE "moments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "moments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"team_id" bigint NOT NULL,
	"name" text NOT NULL,
	"primary_position" text NOT NULL,
	"secondary_position" text,
	"tertiary_position" text,
	"dominant_foot" text,
	"height_cm" smallint,
	"weight_kg" smallint,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sub_moments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"moment_id" bigint NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"championship_id" bigint NOT NULL,
	"name" text NOT NULL,
	"emblem" text,
	"stadium" text,
	"pitch_dimensions" text,
	"pitch_rating" smallint,
	"coach" text,
	"president" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_sub_moment_id_sub_moments_id_fk" FOREIGN KEY ("sub_moment_id") REFERENCES "public"."sub_moments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "championships" ADD CONSTRAINT "championships_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_involvements" ADD CONSTRAINT "goal_involvements_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_involvements" ADD CONSTRAINT "goal_involvements_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_scorer_id_players_id_fk" FOREIGN KEY ("scorer_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_moment_id_moments_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_sub_moment_id_sub_moments_id_fk" FOREIGN KEY ("sub_moment_id") REFERENCES "public"."sub_moments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_goal_zone_id_goalkeeper_zones_id_fk" FOREIGN KEY ("goal_zone_id") REFERENCES "public"."goalkeeper_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_championship_id_championships_id_fk" FOREIGN KEY ("championship_id") REFERENCES "public"."championships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_moments" ADD CONSTRAINT "sub_moments_moment_id_moments_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_championship_id_championships_id_fk" FOREIGN KEY ("championship_id") REFERENCES "public"."championships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "actions_sub_moment_name_key" ON "actions" USING btree ("sub_moment_id","name");--> statement-breakpoint
CREATE INDEX "idx_championships_season" ON "championships" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_involvements_goal_player_role_key" ON "goal_involvements" USING btree ("goal_id","player_id","role");--> statement-breakpoint
CREATE INDEX "idx_goal_involvements_player" ON "goal_involvements" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_goals_team_created_at" ON "goals" USING btree ("team_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "idx_goals_scorer" ON "goals" USING btree ("scorer_id");--> statement-breakpoint
CREATE INDEX "idx_goals_moment" ON "goals" USING btree ("moment_id");--> statement-breakpoint
CREATE INDEX "idx_goals_action" ON "goals" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX "idx_goals_zone" ON "goals" USING btree ("goal_zone_id");--> statement-breakpoint
CREATE INDEX "idx_players_team" ON "players" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_moments_moment_name_key" ON "sub_moments" USING btree ("moment_id","name");--> statement-breakpoint
CREATE INDEX "idx_teams_championship" ON "teams" USING btree ("championship_id");