-- Seed lookup tables
INSERT INTO moments (name) VALUES
  ('Offensive Organization'),
  ('Offensive Transition'),
  ('Offensive Set Pieces'),
  ('Defensive Transition'),
  ('Defensive Organization'),
  ('Defensive Set Pieces')
ON CONFLICT (name) DO NOTHING;

WITH ids AS (
  SELECT name, id FROM moments
)
INSERT INTO sub_moments (moment_id, name) VALUES
  ((SELECT id FROM ids WHERE name = 'Offensive Organization'), 'Build-Up'),
  ((SELECT id FROM ids WHERE name = 'Offensive Organization'), 'Creation'),
  ((SELECT id FROM ids WHERE name = 'Offensive Organization'), 'Finishing'),
  ((SELECT id FROM ids WHERE name = 'Offensive Transition'), 'Counter Attack'),
  ((SELECT id FROM ids WHERE name = 'Offensive Transition'), 'Fast Break'),
  ((SELECT id FROM ids WHERE name = 'Offensive Transition'), 'Pressing Trap'),
  ((SELECT id FROM ids WHERE name = 'Offensive Set Pieces'), 'Corner'),
  ((SELECT id FROM ids WHERE name = 'Offensive Set Pieces'), 'Wide Free Kick'),
  ((SELECT id FROM ids WHERE name = 'Offensive Set Pieces'), 'Central Free Kick'),
  ((SELECT id FROM ids WHERE name = 'Offensive Set Pieces'), 'Penalty'),
  ((SELECT id FROM ids WHERE name = 'Defensive Transition'), 'Counter-Press'),
  ((SELECT id FROM ids WHERE name = 'Defensive Transition'), 'Reorganization'),
  ((SELECT id FROM ids WHERE name = 'Defensive Organization'), 'High Block'),
  ((SELECT id FROM ids WHERE name = 'Defensive Organization'), 'Mid Block'),
  ((SELECT id FROM ids WHERE name = 'Defensive Organization'), 'Low Block'),
  ((SELECT id FROM ids WHERE name = 'Defensive Set Pieces'), 'Defending Corner'),
  ((SELECT id FROM ids WHERE name = 'Defensive Set Pieces'), 'Defending Wide Free Kick'),
  ((SELECT id FROM ids WHERE name = 'Defensive Set Pieces'), 'Defending Central Free Kick')
ON CONFLICT ON CONSTRAINT sub_moments_moment_name_key DO NOTHING;

WITH sm AS (
  SELECT id, name FROM sub_moments
)
INSERT INTO actions (sub_moment_id, name) VALUES
  ((SELECT id FROM sm WHERE name = 'Build-Up'), 'First Phase'),
  ((SELECT id FROM sm WHERE name = 'Build-Up'), 'Switch of Play'),
  ((SELECT id FROM sm WHERE name = 'Creation'), 'Through Ball'),
  ((SELECT id FROM sm WHERE name = 'Creation'), 'Overlap'),
  ((SELECT id FROM sm WHERE name = 'Finishing'), 'Cutback'),
  ((SELECT id FROM sm WHERE name = 'Finishing'), 'Cross Finish'),
  ((SELECT id FROM sm WHERE name = 'Counter Attack'), 'Direct Run'),
  ((SELECT id FROM sm WHERE name = 'Counter Attack'), 'Vertical Pass'),
  ((SELECT id FROM sm WHERE name = 'Fast Break'), '3v2 Break'),
  ((SELECT id FROM sm WHERE name = 'Pressing Trap'), 'High Press Win'),
  ((SELECT id FROM sm WHERE name = 'Corner'), 'Near Post Routine'),
  ((SELECT id FROM sm WHERE name = 'Corner'), 'Far Post Routine'),
  ((SELECT id FROM sm WHERE name = 'Wide Free Kick'), 'Inswinger'),
  ((SELECT id FROM sm WHERE name = 'Central Free Kick'), 'Direct Shot'),
  ((SELECT id FROM sm WHERE name = 'Penalty'), 'Penalty Kick'),
  ((SELECT id FROM sm WHERE name = 'Counter-Press'), 'Immediate Press'),
  ((SELECT id FROM sm WHERE name = 'Reorganization'), 'Drop to Shape'),
  ((SELECT id FROM sm WHERE name = 'High Block'), 'Press Trigger'),
  ((SELECT id FROM sm WHERE name = 'Mid Block'), 'Compactness'),
  ((SELECT id FROM sm WHERE name = 'Low Block'), 'Box Defense'),
  ((SELECT id FROM sm WHERE name = 'Defending Corner'), 'Clearance'),
  ((SELECT id FROM sm WHERE name = 'Defending Wide Free Kick'), 'Win Second Ball'),
  ((SELECT id FROM sm WHERE name = 'Defending Central Free Kick'), 'Wall Block')
ON CONFLICT ON CONSTRAINT actions_sub_moment_name_key DO NOTHING;

INSERT INTO goalkeeper_zones (name) VALUES
  ('Bottom Right'),
  ('Bottom Left'),
  ('Top Right'),
  ('Top Left'),
  ('Center Top'),
  ('Center Bottom')
ON CONFLICT (name) DO NOTHING;

