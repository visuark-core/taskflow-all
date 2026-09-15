// Lazily ensure the primary schema exists (Users, Companies, ...).
// Deterministic and safe on databases that already carry legacy tables with
// data: we ONLY create the two global tables the app needs, guarded by
// probes, and we never alter, drop, or touch business tables. Runs at most
// once per process.
//
// We deliberately do NOT use sequelize.sync() here for the Users/Companies
// tables. Because of the model associations, a `sync({ models: [User, Company] })`
// transitively creates ALL business tables (Departments, Projects, ...) inside
// the primary schema, which can collide with per-tenant schemas and with
// enum types living in a different schema — the failures seen on live
// deployments ("cannot cast type enum_X to public.enum_X", "relation
// Companies does not exist"). Raw DDL is fully deterministic and idempotent.
const { QueryTypes } = require("sequelize");

let syncPromise = null;

function quoteIdent(value) {
  return '"' + String(value).replace(/"/g, '""') + '"';
}

async function ensurePrimarySchema() {
  if (!syncPromise) {
    syncPromise = (async () => {
      const sequelize = require("../config/db");

      // Resolve the schema the connection actually resolves unqualified table
      // names to (search_path). Using only `public` breaks on hosts that use a
      // custom search_path (e.g. Supabase).
      const schemaRows = await sequelize.query(
        `SELECT current_schema() AS "schema"`,
        { type: QueryTypes.SELECT }
      );
      const schema = (schemaRows[0] && schemaRows[0].schema) || "public";
      const s = quoteIdent(schema);

      // Probe which global tables already exist (NULL when missing).
      const rows = await sequelize.query(
        `SELECT to_regclass(${sequelize.escape(`${schema}."Users"`)}) AS "users",
                to_regclass(${sequelize.escape(`${schema}."Companies"`)}) AS "companies"`,
        { type: QueryTypes.SELECT }
      );
      const hasUsers = !!rows[0] && !!rows[0].users;
      const hasCompanies = !!rows[0] && !!rows[0].companies;

      // Companies is the tenant registry; register/check/createCompany all need it.
      if (!hasCompanies) {
        await sequelize.query(
          `DO $$ BEGIN
             CREATE TYPE ${s}."enum_Companies_status" AS ENUM ('provisioning','active');
           EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
        );
        await sequelize.query(
          `CREATE TABLE IF NOT EXISTS ${s}."Companies" (
             "id" SERIAL PRIMARY KEY,
             "name" VARCHAR(255) NOT NULL,
             "slug" VARCHAR(255) NOT NULL,
             "dbHost" VARCHAR(255),
             "dbPort" INTEGER DEFAULT 5432,
             "dbName" VARCHAR(255) NOT NULL,
             "status" ${s}."enum_Companies_status" NOT NULL DEFAULT 'provisioning',
             "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
             "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
             CONSTRAINT "Companies_slug_key" UNIQUE ("slug")
           );`
        );
        console.log("[ensurePrimarySchema] Created Companies table");
      }

      // On a truly fresh deployment the Users table may be missing too.
      if (!hasUsers) {
        await sequelize.query(
          `DO $$ BEGIN
             CREATE TYPE ${s}."enum_Users_role" AS ENUM (
               'user','admin','chief_manager','department_manager','developer',
               'designer','tester','ceo','cfo','cto','cmo','coo','marketer'
             );
           EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
        );
        await sequelize.query(
          `CREATE TABLE IF NOT EXISTS ${s}."Users" (
             "id" SERIAL PRIMARY KEY,
             "name" VARCHAR(255) NOT NULL,
             "email" VARCHAR(255) NOT NULL,
             "password" VARCHAR(255) NOT NULL,
             "role" ${s}."enum_Users_role" DEFAULT 'user',
             "company" VARCHAR(255),
             "department" VARCHAR(255) DEFAULT 'engineering',
             "avatar" VARCHAR(255),
             "preferences" JSONB,
             "isActive" BOOLEAN DEFAULT TRUE,
             "lastLogin" TIMESTAMP WITH TIME ZONE,
             "bio" TEXT,
             "bankDetails" JSONB,
             "managedDepartmentId" INTEGER,
             "reportingManagerId" INTEGER,
             "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
             "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
             CONSTRAINT "Users_email_key" UNIQUE ("email")
           );`
        );
        console.log("[ensurePrimarySchema] Created Users table");
      }

      console.log(`[ensurePrimarySchema] Global tables ensured (schema ${schema})`);
    })();
  }
  return syncPromise;
}

module.exports = ensurePrimarySchema;