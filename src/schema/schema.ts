import { pgTable, bigserial, bigint, serial, smallint, text, date, jsonb, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { desc, sql } from "drizzle-orm";

export type CoordinatePoint = { x: number; y: number };
export type ZoneMarker = { x?: number; y?: number; label?: string; sector?: string };

export const seasons = pgTable(
  "seasons",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull().unique(),
    description: text("description")
  }
);

export const championships = pgTable(
  "championships",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    seasonId: bigint("season_id", { mode: "number" })
      .references(() => seasons.id, { onDelete: "cascade" }),
    country: text("country").notNull(),
    name: text("name").notNull(),
    logo: text("logo")
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
      .references(() => championships.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    emblemPath: text("emblem_path"),
    radiographyPdfUrl: text("radiography_pdf_url"),
    videoReportUrl: text("video_report_url"),
    stadium: text("stadium"),
    pitchDimensions: text("pitch_dimensions"),
    pitchRating: smallint("pitch_rating"),
    coach: text("coach"),
    president: text("president")
  },
  (table) => ({
    idxChampionship: index("idx_teams_championship").on(table.championshipId),
    uniqueName: uniqueIndex("teams_name_key").on(table.name)
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
    photoPath: text("photo_path"),
    primaryPosition: text("primary_position").notNull(),
    secondaryPosition: text("secondary_position"),
    tertiaryPosition: text("tertiary_position"),
    dominantFoot: text("dominant_foot"),
    heightCm: smallint("height_cm"),
    weightKg: smallint("weight_kg")
  },
  (table) => ({
    idxTeam: index("idx_players_team").on(table.teamId)
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
    name: text("name").notNull(),
    context: text("context")
      .notNull()
      .default("field_goal")
      .$type<"field" | "field_goal">()
  },
  (table) => ({
    uniqueSubMomentName: uniqueIndex("actions_sub_moment_name_key").on(table.subMomentId, table.name),
    contextCheck: check("actions_context_check", sql`${table.context} IN ('field','field_goal')`)
  })
);

export const goals = pgTable(
  "goals",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    opponentTeamId: bigint("opponent_team_id", { mode: "number" }).references(() => teams.id),
    teamId: bigint("team_id", { mode: "number" })
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    scorerId: bigint("scorer_id", { mode: "number" })
      .notNull()
      .references(() => players.id),
    assistId: bigint("assist_id", { mode: "number" }).references(() => players.id),
    minute: smallint("minute").notNull(),
    momentId: bigint("moment_id", { mode: "number" })
      .notNull()
      .references(() => moments.id),
    subMomentId: bigint("sub_moment_id", { mode: "number" })
      .notNull()
      .references(() => subMoments.id),
    actionId: bigint("action_id", { mode: "number" })
      .notNull()
      .references(() => actions.id),
    videoPath: text("video_path"),
    goalZoneId: smallint("goal_zone_id").references(() => goalkeeperZones.id),
    cornerTakerId: bigint("corner_taker_id", { mode: "number" }).references(() => players.id),
    freekickTakerId: bigint("freekick_taker_id", { mode: "number" }).references(() => players.id),
    penaltyTakerId: bigint("penalty_taker_id", { mode: "number" }).references(() => players.id),
    crossAuthorId: bigint("cross_author_id", { mode: "number" }).references(() => players.id),
    throwInTakerId: bigint("throw_in_taker_id", { mode: "number" }).references(() => players.id),
    referencePlayerId: bigint("reference_player_id", { mode: "number" }).references(() => players.id),
    foulSufferedById: bigint("foul_suffered_by_id", { mode: "number" }).references(() => players.id),
    previousMomentDescription: text("previous_moment_description"),
    goalCoordinates: jsonb("goal_coordinates").$type<CoordinatePoint | null>(),
    fieldDrawing: jsonb("field_drawing").$type<CoordinatePoint | null>(),
    assistCoordinates: jsonb("assist_coordinates").$type<ZoneMarker | null>(),
    assistSector: text("assist_sector"),
    shotSector: text("shot_sector"),
    finishSector: text("finish_sector"),
    buildUpPhase: text("build_up_phase"),
    creationPhase: text("creation_phase"),
    finalizationPhase: text("finalization_phase"),
    cornerProfile: text("corner_profile").$type<"fechado" | "aberto" | "combinado" | null>(),
    freekickProfile: text("freekick_profile").$type<"fechado" | "aberto" | "combinado" | null>(),
    throwInProfile: text("throw_in_profile").$type<"area" | "organizacao" | null>(),
    goalkeeperOutlet: text("goalkeeper_outlet").$type<"organizacao" | "curto_para_longo" | "bola_longa" | null>(),
    notes: text("notes")
  },
  (table) => ({
    minuteCheck: check("goals_minute_check", sql`${table.minute} BETWEEN 0 AND 130`),
    idxTeamMinute: index("idx_goals_team_minute").on(table.teamId),
    idxOpponent: index("idx_goals_opponent").on(table.opponentTeamId),
    idxScorer: index("idx_goals_scorer").on(table.scorerId),
    idxAssist: index("idx_goals_assist").on(table.assistId),
    idxMoment: index("idx_goals_moment").on(table.momentId),
    idxAction: index("idx_goals_action").on(table.actionId),
    idxZone: index("idx_goals_zone").on(table.goalZoneId),
    idxCornerTaker: index("idx_goals_corner_taker").on(table.cornerTakerId),
    idxFreekickTaker: index("idx_goals_freekick_taker").on(table.freekickTakerId),
    idxPenaltyTaker: index("idx_goals_penalty_taker").on(table.penaltyTakerId),
    idxCrossAuthor: index("idx_goals_cross_author").on(table.crossAuthorId),
    idxThrowInTaker: index("idx_goals_throw_in_taker").on(table.throwInTakerId),
    idxReferencePlayer: index("idx_goals_reference_player").on(table.referencePlayerId),
    idxFoulSufferedBy: index("idx_goals_foul_suffered_by").on(table.foulSufferedById)
  })
);

export const goalActions = pgTable(
  "goal_actions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    goalId: bigint("goal_id", { mode: "number" })
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    actionId: bigint("action_id", { mode: "number" })
      .notNull()
      .references(() => actions.id, { onDelete: "cascade" })
  },
  (table) => ({
    uniqGoalAction: uniqueIndex("goal_actions_goal_action_key").on(table.goalId, table.actionId),
    idxGoal: index("idx_goal_actions_goal").on(table.goalId),
    idxAction: index("idx_goal_actions_action").on(table.actionId)
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
export type GoalAction = typeof goalActions.$inferSelect;
export type GoalInvolvement = typeof goalInvolvements.$inferSelect;
