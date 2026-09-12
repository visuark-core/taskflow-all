// Lazily ensure the primary schema exists (Users, Companies, ...).
// Deterministic and safe on databases that already carry legacy tables with
// data: a full sequelize.sync() can conflict with pre-existing table shapes,
// so we only create the specific global tables the app needs, guarded by a
// probe, and never alter or drop anything. Runs at most once per process.
const { QueryTypes } = require("sequelize");

let syncPromise = null;

async function ensurePrimarySchema() {
  if (!syncPromise) {
    syncPromise = (async () => {
      const sequelize = require("../config/db");

      // Probe which global tables already exist (NULL when missing).
      const rows = await sequelize.query(
        `SELECT to_regclass('public."Users"') AS "users", to_regclass('public."Companies"') AS "companies"`,
        { type: QueryTypes.SELECT }
      );
      const hasUsers = !!rows[0] && !!rows[0].users;
      const hasCompanies = !!rows[0] && !!rows[0].companies;

      // Companies is the tenant registry; register/check/createCompany all need it.
      if (!hasCompanies) {
        await sequelize.query(
          `DO $$ BEGIN
             CREATE TYPE "enum_Companies_status" AS ENUM ('provisioning','active');
           EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
        );
        await sequelize.query(
          `CREATE TABLE IF NOT EXISTS "Companies" (
             "id" SERIAL PRIMARY KEY,
             "name" VARCHAR(255) NOT NULL,
             "slug" VARCHAR(255) NOT NULL,
             "dbHost" VARCHAR(255),
             "dbPort" INTEGER DEFAULT 5432,
             "dbName" VARCHAR(255) NOT NULL,
             "status" "enum_Companies_status" NOT NULL DEFAULT 'provisioning',
             "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
             "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
             CONSTRAINT "Companies_slug_key" UNIQUE ("slug")
           );`
        );
        console.log("[ensurePrimarySchema] Created Companies table");
      }

      // On a truly fresh deployment the Users table may be missing too.
      // Bootstrap it via the model definition (create-if-missing only).
      if (!hasUsers) {
        const models = require("../models");
        await models.sequelize.sync({ models: [models.User, models.Company] });
        console.log("[ensurePrimarySchema] Created Users table");
      }

      console.log("[ensurePrimarySchema] Global tables ensured");
    })();
  }
  return syncPromise;
}

module.exports = ensurePrimarySchema;