-- Cleanup of verification/test data created while fixing the production login 401.
-- Run in Supabase -> SQL Editor. Safe to re-run (targets only the test companies,
-- emails and tenant schemas created during verification; keeps the default admin
-- and any real companies/users).

BEGIN;

-- 1. Remove verification users created during register tests.
DELETE FROM "Users"
 WHERE email LIKE 'deployverify%@visuark.com'
    OR email LIKE 'verifyend%@visuark.com';

-- 2. Remove the Companies registry rows for the verification companies.
DELETE FROM "Companies"
 WHERE name LIKE 'Deploy Verify %'
    OR name LIKE 'Verify End-to-End %';

-- 3. Drop the tenant schemas provisioned for those test companies.
DROP SCHEMA IF EXISTS "taskflow_deploy-verify-1789445588" CASCADE;
DROP SCHEMA IF EXISTS "taskflow_deploy-verify-1789446122" CASCADE;
DROP SCHEMA IF EXISTS "taskflow_verify-end-to-end-1789446806" CASCADE;

COMMIT;