import { pgTable, bigserial, serial, smallint, text, timestamp, bigint, date, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { desc, sql } from "drizzle-orm";

export const seasons = pgTable("seasons", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const championships = pgTable(
  "championships",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    seasonId: bigint("season_id", { mode: "number" })
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    country: text("country").notNull(),
    name: text("name").notNull(),
    logo: text("logo"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    idxSeason: index("idx_championships_season").on(table.seasonId)
  })
);

export const teams = pgTable(
  "teams",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    championshipId: bigint("championship_id", { mode: "number" })
      .notNull()
      .references(() => championships.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    emblem: text("emblem"),
    stadium: text("stadium"),
    pitchDimensions: text("pitch_dimensions"),
    pitchRating: smallint("pitch_rating"),
    coach: text("coach"),
    president: text("president"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    idxChampionship: index("idx_teams_championship").on(table.championshipId)
  })
);

export const players = pgTable(
  "players",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    teamId: bigint("team_id", { mode: "number" })
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    primaryPosition: text("primary_position").notNull(),
    secondaryPosition: text("secondary_position"),
    tertiaryPosition: text("tertiary_position"),
    dominantFoot: text("dominant_foot"),
    heightCm: smallint("height_cm"),
    weightKg: smallint("weight_kg"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    idxTeam: index("idx_players_team").on(table.teamId)
  })
);

export const moments = pgTable("moments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull().unique()
});

export const subMoments = pgTable(
  "sub_moments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    momentId: bigint("moment_id", { mode: "number" })
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    name: text("name").notNull()
  },
  (table) => ({
    uniqueMomentName: uniqueIndex("sub_moments_moment_name_key").on(table.momentId, table.name)
  })
);

export const actions = pgTable(
  "actions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    subMomentId: bigint("sub_moment_id", { mode: "number" })
      .notNull()
      .references(() => subMoments.id, { onDelete: "cascade" }),
    name: text("name").notNull()
  },
  (table) => ({
    uniqueSubMomentName: uniqueIndex("actions_sub_moment_name_key").on(table.subMomentId, table.name)
  })
);

export const goalkeeperZones = pgTable("goalkeeper_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique()
});

export const matches = pgTable("matches", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  championshipId: bigint("championship_id", { mode: "number" }).references(() => championships.id),
  homeTeamId: bigint("home_team_id", { mode: "number" }).references(() => teams.id),
  awayTeamId: bigint("away_team_id", { mode: "number" }).references(() => teams.id),
  matchDate: date("match_date"),
  venue: text("venue")
});

export const goals = pgTable(
  "goals",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    matchId: bigint("match_id", { mode: "number" }).references(() => matches.id),
    teamId: bigint("team_id", { mode: "number" })
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    scorerId: bigint("scorer_id", { mode: "number" }).notNull().references(() => players.id),
    minute: smallint("minute").notNull(),
    momentId: bigint("moment_id", { mode: "number" }).notNull().references(() => moments.id),
    subMomentId: bigint("sub_moment_id", { mode: "number" }).notNull().references(() => subMoments.id),
    actionId: bigint("action_id", { mode: "number" }).notNull().references(() => actions.id),
    goalZoneId: smallint("goal_zone_id", { mode: "number" }).notNull().references(() => goalkeeperZones.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    minuteCheck: check("goals_minute_check", sql`${table.minute} BETWEEN 0 AND 130`),
    idxTeamCreated: index("idx_goals_team_created_at").on(table.teamId, desc(table.createdAt)),
    idxScorer: index("idx_goals_scorer").on(table.scorerId),
    idxMoment: index("idx_goals_moment").on(table.momentId),
    idxAction: index("idx_goals_action").on(table.actionId),
    idxZone: index("idx_goals_zone").on(table.goalZoneId)
  })
);

export const goalInvolvements = pgTable(
  "goal_involvements",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    goalId: bigint("goal_id", { mode: "number" })
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    playerId: bigint("player_id", { mode: "number" })
      .notNull()
      .references(() => players.id),
    role: text("role").notNull()
  },
  (table) => ({
    uniqueGoalPlayerRole: uniqueIndex("goal_involvements_goal_player_role_key").on(table.goalId, table.playerId, table.role),
    roleCheck: check("goal_involvements_role_check", sql`role IN ('assist','involvement')`),
    idxPlayer: index("idx_goal_involvements_player").on(table.playerId)
  })
);

export type Season = typeof seasons.$inferSelect;
export type Championship = typeof championships.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type GoalInvolvement = typeof goalInvolvements.$inferSelect;

