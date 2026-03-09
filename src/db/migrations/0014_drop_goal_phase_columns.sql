ALTER TABLE "goals"
  DROP COLUMN IF EXISTS "build_up_phase",
  DROP COLUMN IF EXISTS "creation_phase",
  DROP COLUMN IF EXISTS "finalization_phase";
