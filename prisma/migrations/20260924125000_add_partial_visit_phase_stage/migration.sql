DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'LeadStage' AND e.enumlabel = 'PARTIAL_VISIT_PHASE'
  ) THEN
    ALTER TYPE "LeadStage" ADD VALUE 'PARTIAL_VISIT_PHASE';
  END IF;
END
$$;
