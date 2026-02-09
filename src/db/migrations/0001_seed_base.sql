-- Seed base lookup data
INSERT INTO seasons (name, description)
VALUES ('2024/2025', 'Temporada 2024/2025')
ON CONFLICT (name) DO NOTHING;

INSERT INTO championships (season_id, country, name)
VALUES (
  (SELECT id FROM seasons WHERE name = '2024/2025'),
  'Portugal',
  'Liga Portugal 2'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO goalkeeper_zones (name) VALUES
  ('Canto Inferior Direito'),
  ('Canto Inferior Esquerdo'),
  ('Canto Superior Direito'),
  ('Canto Superior Esquerdo'),
  ('Centro Superior'),
  ('Centro Inferior')
ON CONFLICT (name) DO NOTHING;
