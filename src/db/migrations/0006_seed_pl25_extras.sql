-- Extra players for Arsenal 2025/2026
DO $$
DECLARE
  arsenal_id bigint;
BEGIN
  SELECT id INTO arsenal_id FROM teams WHERE name = 'Arsenal' LIMIT 1;
  IF arsenal_id IS NULL THEN
    RAISE NOTICE 'Arsenal not found, skipping seed';
    RETURN;
  END IF;

  PERFORM 1 FROM players WHERE team_id = arsenal_id AND name = 'Viktor Gyokeres';
  IF NOT FOUND THEN
    INSERT INTO players (team_id, name, primary_position) VALUES (arsenal_id, 'Viktor Gyokeres', 'AV');
  END IF;
END$$;
