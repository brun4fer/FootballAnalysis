INSERT INTO "actions" ("sub_moment_id", "name", "context")
SELECT sm."id", 'Jogador Referência', 'field'
FROM "sub_moments" sm
ON CONFLICT ("sub_moment_id", "name") DO NOTHING;
