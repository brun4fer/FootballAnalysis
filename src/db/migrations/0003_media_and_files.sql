-- Add media/support columns for teams, players, goals
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS radiography_pdf_url text,
  ADD COLUMN IF NOT EXISTS video_report_url text;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS video_url text;
