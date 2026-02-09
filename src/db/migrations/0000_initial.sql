CREATE TABLE IF NOT EXISTS seasons (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS championships (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  name TEXT NOT NULL,
  logo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id BIGSERIAL PRIMARY KEY,
  championship_id BIGINT NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emblem TEXT,
  stadium TEXT,
  pitch_dimensions TEXT,
  pitch_rating SMALLINT,
  coach TEXT,
  president TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  primary_position TEXT NOT NULL,
  secondary_position TEXT,
  tertiary_position TEXT,
  dominant_foot TEXT,
  height_cm SMALLINT,
  weight_kg SMALLINT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moments (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sub_moments (
  id BIGSERIAL PRIMARY KEY,
  moment_id BIGINT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  CONSTRAINT sub_moments_moment_name_key UNIQUE(moment_id, name)
);

CREATE TABLE IF NOT EXISTS actions (
  id BIGSERIAL PRIMARY KEY,
  sub_moment_id BIGINT NOT NULL REFERENCES sub_moments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  CONSTRAINT actions_sub_moment_name_key UNIQUE(sub_moment_id, name)
);

CREATE TABLE IF NOT EXISTS goalkeeper_zones (
  id SMALLSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  championship_id BIGINT REFERENCES championships(id),
  home_team_id BIGINT REFERENCES teams(id),
  away_team_id BIGINT REFERENCES teams(id),
  match_date DATE,
  venue TEXT
);

CREATE TABLE IF NOT EXISTS goals (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES matches(id),
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  scorer_id BIGINT NOT NULL REFERENCES players(id),
  minute SMALLINT NOT NULL CHECK (minute BETWEEN 0 AND 130),
  moment_id BIGINT NOT NULL REFERENCES moments(id),
  sub_moment_id BIGINT NOT NULL REFERENCES sub_moments(id),
  action_id BIGINT NOT NULL REFERENCES actions(id),
  goal_zone_id SMALLINT NOT NULL REFERENCES goalkeeper_zones(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_involvements (
  id BIGSERIAL PRIMARY KEY,
  goal_id BIGINT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES players(id),
  role TEXT NOT NULL CHECK (role IN ('assist','involvement')),
  CONSTRAINT goal_involvements_goal_player_role_key UNIQUE (goal_id, player_id, role)
);

CREATE INDEX IF NOT EXISTS idx_goals_team_created_at ON goals(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_scorer ON goals(scorer_id);
CREATE INDEX IF NOT EXISTS idx_goals_moment ON goals(moment_id);
CREATE INDEX IF NOT EXISTS idx_goals_action ON goals(action_id);
CREATE INDEX IF NOT EXISTS idx_goals_zone ON goals(goal_zone_id);
CREATE INDEX IF NOT EXISTS idx_goal_involvements_player ON goal_involvements(player_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_championship ON teams(championship_id);
CREATE INDEX IF NOT EXISTS idx_championships_season ON championships(season_id);

