-- Add explicit ward ownership to central kitchens.
ALTER TABLE "kitchens" ADD COLUMN "ward_id" UUID;

-- Existing central kitchens must be assigned to one unambiguous, non-null school ward.
DO $$
BEGIN
  IF EXISTS (
    SELECT a."kitchen_id"
    FROM "kitchen_school_assignments" a
    JOIN "kitchens" k ON k."id" = a."kitchen_id"
    JOIN "schools" s ON s."id" = a."school_id"
    WHERE k."type" = 'CENTRAL'
    GROUP BY a."kitchen_id"
    HAVING COUNT(DISTINCT s."ward_id") FILTER (WHERE s."ward_id" IS NOT NULL) > 1
       OR COUNT(*) FILTER (WHERE s."ward_id" IS NULL) > 0
  ) THEN
    RAISE EXCEPTION 'Cannot migrate central kitchens: existing assignments span wards or include schools without wardId.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "kitchens" k
    WHERE k."type" = 'CENTRAL'
      AND NOT EXISTS (
        SELECT 1 FROM "kitchen_school_assignments" a
        JOIN "schools" s ON s."id" = a."school_id"
        WHERE a."kitchen_id" = k."id" AND s."ward_id" IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'Cannot migrate central kitchens: a central kitchen has no assigned school with a ward.';
  END IF;
END $$;

UPDATE "kitchens" k
SET "ward_id" = (
  SELECT MIN(s."ward_id"::text)::uuid
  FROM "kitchen_school_assignments" a
  JOIN "schools" s ON s."id" = a."school_id"
  WHERE a."kitchen_id" = k."id"
    AND s."ward_id" IS NOT NULL
)
WHERE k."type" = 'CENTRAL';

ALTER TABLE "kitchens"
  ADD CONSTRAINT "kitchens_ward_id_fkey"
  FOREIGN KEY ("ward_id") REFERENCES "wards"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "kitchens_ward_id_type_is_active_idx"
  ON "kitchens"("ward_id", "type", "is_active");

ALTER TABLE "kitchens"
  ADD CONSTRAINT "kitchens_type_ward_school_check"
  CHECK (
    ("type" = 'CENTRAL' AND "ward_id" IS NOT NULL AND "school_id" IS NULL)
    OR
    ("type" = 'SCHOOL' AND "ward_id" IS NULL AND "school_id" IS NOT NULL)
  );

-- Enforce same-ward assignments and reject assignment when an active on-site kitchen exists.
CREATE OR REPLACE FUNCTION "enforce_kitchen_school_assignment_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  kitchen_ward UUID;
  school_ward UUID;
BEGIN
  IF NEW."is_active" = true AND NEW."ends_at" IS NULL THEN
    SELECT "ward_id" INTO kitchen_ward
    FROM "kitchens"
    WHERE "id" = NEW."kitchen_id" AND "type" = 'CENTRAL' AND "is_active" = true;

    IF kitchen_ward IS NULL THEN
      RAISE EXCEPTION 'Only an active central kitchen with a ward may receive active school assignments.';
    END IF;

    SELECT "ward_id" INTO school_ward
    FROM "schools"
    WHERE "id" = NEW."school_id";

    IF school_ward IS NULL OR school_ward <> kitchen_ward THEN
      RAISE EXCEPTION 'Central kitchen and school must belong to the same ward.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM "kitchens"
      WHERE "type" = 'SCHOOL'
        AND "school_id" = NEW."school_id"
        AND "is_active" = true
    ) THEN
      RAISE EXCEPTION 'School already has an active on-site kitchen.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "kitchen_school_assignment_scope_trigger"
BEFORE INSERT OR UPDATE ON "kitchen_school_assignments"
FOR EACH ROW
EXECUTE FUNCTION "enforce_kitchen_school_assignment_scope"();

-- Prevent activating an on-site kitchen while a central assignment is active.
CREATE OR REPLACE FUNCTION "enforce_on_site_kitchen_provider_exclusivity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."type" = 'SCHOOL' AND NEW."is_active" = true AND EXISTS (
    SELECT 1 FROM "kitchen_school_assignments"
    WHERE "school_id" = NEW."school_id"
      AND "is_active" = true
      AND "ends_at" IS NULL
  ) THEN
    RAISE EXCEPTION 'School already has an active central kitchen assignment.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "on_site_kitchen_provider_exclusivity_trigger"
BEFORE INSERT OR UPDATE OF "is_active", "school_id", "type" ON "kitchens"
FOR EACH ROW
EXECUTE FUNCTION "enforce_on_site_kitchen_provider_exclusivity"();
