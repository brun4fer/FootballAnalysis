-- Seed Liga Portugal 2 teams
INSERT INTO teams (championship_id, name) VALUES
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'Académico de Viseu'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'AVS Futebol SAD'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'Belenenses'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'CD Mafra'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'CD Nacional'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'Feirense'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'FC Penafiel'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'FC Porto B'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'Leixões SC'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'Marítimo'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'Oliveirense'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'Paços de Ferreira'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'Santa Clara'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'Torreense'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'Tondela'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'União de Leiria'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'Benfica B'),
  ((SELECT id FROM championships WHERE name = 'Liga Portugal 2'), 'Estrela da Amadora')
ON CONFLICT DO NOTHING;
