-- Migrate media columns to local paths
ALTER TABLE teams
  RENAME COLUMN IF EXISTS emblem TO emblem_path;

ALTER TABLE players
  RENAME COLUMN IF EXISTS photo_url TO photo_path;

ALTER TABLE goals
  RENAME COLUMN IF EXISTS video_url TO video_path;
