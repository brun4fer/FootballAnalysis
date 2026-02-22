-- Add set-piece and crossing taker references & clean redundant actions
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS corner_taker_id bigint REFERENCES players(id),
  ADD COLUMN IF NOT EXISTS freekick_taker_id bigint REFERENCES players(id),
  ADD COLUMN IF NOT EXISTS penalty_taker_id bigint REFERENCES players(id),
  ADD COLUMN IF NOT EXISTS cross_author_id bigint REFERENCES players(id);

CREATE INDEX IF NOT EXISTS idx_goals_corner_taker ON goals(corner_taker_id);
CREATE INDEX IF NOT EXISTS idx_goals_freekick_taker ON goals(freekick_taker_id);
CREATE INDEX IF NOT EXISTS idx_goals_penalty_taker ON goals(penalty_taker_id);
CREATE INDEX IF NOT EXISTS idx_goals_cross_author ON goals(cross_author_id);

-- Remove redundant actions globally
DELETE FROM actions WHERE name IN ('Assistência','Marcador','Unidades de ligação');
