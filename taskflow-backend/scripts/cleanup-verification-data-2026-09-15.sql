-- Cleanup of verification/test data created on 2026-09-15 while verifying
-- cold-start register + maxDuration fixes against the deployed backend
-- (SLUG/company prefix patterns are unique to these tests).
-- Run in Supabase -> SQL Editor. Safe to re-run: rows/schemas may already
-- have been rolled back (IF EXISTS / IN guards). Does NOT touch the default
-- admin, the 'visuark' company, or any real user/company/schema.

-- 0) Optional: confirm whether the round-B cold-start orphan still exists
--    (a Companies row left at 'provisioning' with no user, or a partial schema).
--    SELECT "slug","status" FROM "Companies" WHERE "slug" LIKE 'cold-verify-%' OR "slug" LIKE 'verify-%';
--    SELECT nspname FROM pg_namespace WHERE nspname LIKE 'taskflow_cold-verify-%' OR nspname LIKE 'taskflow_verify-%';

BEGIN;

-- 1. Remove verification users created during register tests.
DELETE FROM "Users" WHERE email IN (
  'maxdurverify1789451690@visuark.com',
  'coldverify1789452575@visuark.com',
  'coldverify1789452820@visuark.com',
  'coldverify1789453023@visuark.com',
  'coldverify1789453247@visuark.com'
);

-- 2. Remove the Companies registry rows for the verification companies.
DELETE FROM "Companies" WHERE "slug" IN (
  'verify-maxduration-1789451690',
  'verify-maxduration-2-1789451690',
  'cold-verify-a-1789452575',
  'cold-verify-b-1789452820',
  'cold-verify-c-1789453023',
  'cold-verify-d-1789453247'
);

-- 3. Drop the tenant schemas provisioned for those test companies.
DROP SCHEMA IF EXISTS "taskflow_verify-maxduration-1789451690" CASCADE;
DROP SCHEMA IF EXISTS "taskflow_verify-maxduration-2-1789451690" CASCADE;
DROP SCHEMA IF EXISTS "taskflow_cold-verify-a-1789452575" CASCADE;
DROP SCHEMA IF EXISTS "taskflow_cold-verify-b-1789452820" CASCADE;
DROP SCHEMA IF EXISTS "taskflow_cold-verify-c-1789453023" CASCADE;
DROP SCHEMA IF EXISTS "taskflow_cold-verify-d-1789453247" CASCADE;

COMMIT;