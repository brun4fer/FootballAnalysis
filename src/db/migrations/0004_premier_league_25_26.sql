-- Premier League 2025/2026 data + goals opponent linkage

-- Ensure season 2025/2026 exists
INSERT INTO seasons (name, description)
VALUES ('2025/2026', 'Temporada 2025/2026')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Ensure Premier League championship is tied to 2025/2026
INSERT INTO championships (season_id, country, name, logo)
SELECT s.id, 'England', 'Premier League', NULL
FROM seasons s
WHERE s.name = '2025/2026'
ON CONFLICT (name) DO UPDATE SET season_id = EXCLUDED.season_id, country = EXCLUDED.country, logo = EXCLUDED.logo;

-- Seed Premier League teams for 2025/2026
WITH pl AS (SELECT id FROM championships WHERE name = 'Premier League' LIMIT 1)
INSERT INTO teams (championship_id, name)
VALUES
  ((SELECT id FROM pl), 'Arsenal'),
  ((SELECT id FROM pl), 'Aston Villa'),
  ((SELECT id FROM pl), 'Bournemouth'),
  ((SELECT id FROM pl), 'Brentford'),
  ((SELECT id FROM pl), 'Brighton'),
  ((SELECT id FROM pl), 'Burnley'),
  ((SELECT id FROM pl), 'Chelsea'),
  ((SELECT id FROM pl), 'Crystal Palace'),
  ((SELECT id FROM pl), 'Everton'),
  ((SELECT id FROM pl), 'Fulham'),
  ((SELECT id FROM pl), 'Leeds United'),
  ((SELECT id FROM pl), 'Leicester City'),
  ((SELECT id FROM pl), 'Liverpool'),
  ((SELECT id FROM pl), 'Manchester City'),
  ((SELECT id FROM pl), 'Manchester United'),
  ((SELECT id FROM pl), 'Newcastle United'),
  ((SELECT id FROM pl), 'Nottingham Forest'),
  ((SELECT id FROM pl), 'Sheffield United'),
  ((SELECT id FROM pl), 'Tottenham Hotspur'),
  ((SELECT id FROM pl), 'West Ham')
ON CONFLICT (name) DO UPDATE SET championship_id = EXCLUDED.championship_id;

-- Seed Arsenal squad for 2025/2026 (avoid duplicates by name/team)
DO $$
DECLARE
  arsenal_id bigint;
BEGIN
  SELECT id INTO arsenal_id FROM teams WHERE name = 'Arsenal' LIMIT 1;
  IF arsenal_id IS NULL THEN
    RAISE NOTICE 'Arsenal team not found; skipping player seed.';
    RETURN;
  END IF;

  INSERT INTO players (team_id, name, primary_position)
  SELECT arsenal_id, 'David Raya', 'GR'
  WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = arsenal_id AND p.name = 'David Raya');

  INSERT INTO players (team_id, name, primary_position)
  SELECT arsenal_id, 'William Saliba', 'DC'
  WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = arsenal_id AND p.name = 'William Saliba');

  INSERT INTO players (team_id, name, primary_position)
  SELECT arsenal_id, 'Gabriel Magalhães', 'DC'
  WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = arsenal_id AND p.name = 'Gabriel Magalhães');

  INSERT INTO players (team_id, name, primary_position)
  SELECT arsenal_id, 'Ben White', 'DD'
  WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = arsenal_id AND p.name = 'Ben White');

  INSERT INTO players (team_id, name, primary_position)
  SELECT arsenal_id, 'Jurrien Timber', 'DE'
  WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = arsenal_id AND p.name = 'Jurrien Timber');

  INSERT INTO players (team_id, name, primary_position)
  SELECT arsenal_id, 'Declan Rice', 'MC'
  WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = arsenal_id AND p.name = 'Declan Rice');

  INSERT INTO players (team_id, name, primary_position)
  SELECT arsenal_id, 'Martin Ødegaard', 'MO'
  WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = arsenal_id AND p.name = 'Martin Ødegaard');

  INSERT INTO players (team_id, name, primary_position)
  SELECT arsenal_id, 'Mikel Merino', 'MC'
  WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = arsenal_id AND p.name = 'Mikel Merino');

  INSERT INTO players (team_id, name, primary_position)
  SELECT arsenal_id, 'Bukayo Saka', 'ED'
  WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = arsenal_id AND p.name = 'Bukayo Saka');

  INSERT INTO players (team_id, name, primary_position)
  SELECT arsenal_id, 'Gabriel Martinelli', 'EE'
  WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = arsenal_id AND p.name = 'Gabriel Martinelli');

  INSERT INTO players (team_id, name, primary_position)
  SELECT arsenal_id, 'Kai Havertz', 'AV'
  WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = arsenal_id AND p.name = 'Kai Havertz');
END$$;

-- Replace match_id with opponent_team_id in goals, linking to teams
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'match_id') THEN
    ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_match_id_matches_id_fk;
    ALTER TABLE goals RENAME COLUMN match_id TO opponent_team_id;
  END IF;
END$$;

ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_opponent_team_id_fkey;
ALTER TABLE goals ADD CONSTRAINT goals_opponent_team_id_fkey FOREIGN KEY (opponent_team_id) REFERENCES teams(id) ON DELETE SET NULL;
