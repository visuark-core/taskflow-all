const { Sequelize, QueryTypes } = require("sequelize");
const { build } = require("../models");
const makeSequelize = require("../utils/makeSequelize");
const normalizeSupabaseUri = require("../utils/normalizeSupabaseUri");

const TENANT_PREFIX = "taskflow_";
const BUSINESS = [
  "Department", "Team", "Project", "Client", "Service", "Invoice", "InvoiceItem", "InvoicePayment",
  "Task", "Activity", "Message", "Notification", "SalaryDetail", "SalaryPayout",
  "Expense", "CompanyBillingSetting", "ProjectMember", "TeamMember", "DepartmentMember",
  "TaskComment", "TaskAttachment", "TaskLabel",
];

const instanceCache = new Map(); // slug -> { sequelize, models }

function primaryDbUri() {
  return normalizeSupabaseUri(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

// Connection used for DDL (CREATE SCHEMA, etc.) – close after use.
function ownerConnection() {
  const uri = primaryDbUri();
  if (!uri) throw new Error("DATABASE_URL is required for tenant provisioning");
  return new Sequelize(uri, {
    dialect: "postgres",
    dialectModule: require("pg"),
    logging: false,
    pool: { max: 1, min: 0, idle: 500 },
  });
}

// Create a schema (not a database) in the primary DB.
async function createSchema(slug) {
  const schema = `${TENANT_PREFIX}${slug}`;
  const owner = ownerConnection();
  try {
    await owner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  } finally {
    await owner.close();
  }
}

// Drop a tenant schema (used to roll back a partial registration).
async function dropTenantSchema(slug) {
  const schema = `${TENANT_PREFIX}${slug}`;
  const owner = ownerConnection();
  try {
    await owner.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await owner.close();
  }
}

// Sequelize instance bound to a tenant schema in the primary DB.
// options.schema makes Sequelize qualify all DDL/queries to that schema.
function makeTenantSequelize(slug) {
  const schema = `${TENANT_PREFIX}${slug}`;
  const uri = primaryDbUri();
  if (!uri) throw new Error("DATABASE_URL is required");
  const seq = makeSequelize(uri);
  seq.options.schema = schema;
  seq.addHook("afterConnect", async (connection) => {
    await connection.query(`SET search_path TO "${schema}", public`);
  });
  return seq;
}

// After schema sync, tenant schemas keep only business tables. Drop FK
// constraints referencing the global Users table (user rows live in the
// public schema; IDs become loose references enforced by the application).
async function stripCrossDbUserRefs(seq) {
  const refs = await seq.query(
    `SELECT c.relname AS tbl, con.conname
     FROM pg_constraint con
     JOIN pg_class c ON c.oid = con.conrelid
     WHERE con.contype = 'f' AND con.confrelid = '"Users"'::regclass`,
    { type: QueryTypes.SELECT }
  );
  for (const r of refs) {
    const tbl = String(r.tbl).replace(/"/g, '""');
    const con = String(r.conname).replace(/"/g, '""');
    await seq.query(`ALTER TABLE "${tbl}" DROP CONSTRAINT "${con}"`);
  }
  await seq.query('DROP TABLE IF EXISTS "Users" CASCADE');
  await seq.query('DROP TABLE IF EXISTS "Companies"');
}

async function provisionCompany(company) {
  const slug = company.slug;
  // DDL over the pooler is slow on cold starts; bound its retries so a cold
  // failure can be retried once without blowing past the function duration cap.
  await retryTransient(async () => {
    await createSchema(slug);
    const seq = makeTenantSequelize(slug);
    try {
      build(seq);
      await seq.sync({ alter: true });
      await stripCrossDbUserRefs(seq);
    } finally {
      await seq.close();
    }
  }, { attempts: 2 });
  // The tail (update + reload) reads the Companies registry row back through
  // the pooler, where a lagging replica can report the row/schema missing the
  // instant after it was created. Retrying just this tail is cheap, so give it
  // more attempts than the slow DDL phase.
  return retryTransient(async () => {
    await company.update({ status: "active", dbName: `${TENANT_PREFIX}${slug}` });
    return await company.reload();
  }, { attempts: 3, baseDelayMs: 1000 });
}

function getModels(slug) {
  const entry = getCache(slug);
  if (!entry) throw new Error("tenant not preloaded: " + slug);
  return entry.models;
}

function setCache(slug, entry) {
  instanceCache.set(slug, entry);
}

function getCache(slug) {
  return instanceCache.get(slug) || null;
}

async function syncAllTenants() {
  const results = [];
  for (const slug of instanceCache.keys()) {
    const seq = makeTenantSequelize(slug);
    build(seq);
    await seq.sync({ alter: true });
    await stripCrossDbUserRefs(seq);
    await seq.close();
    results.push(slug);
  }
  return { synced: results };
}

function isMissingTableError(err) {
  return !!err && (
    /relation .* does not exist/i.test(err.message) ||
    /table .* does not exist/i.test(err.message) ||
    /unknown table/i.test(err.message)
  );
}

function isTransientDbError(err) {
  return !!err && (
    isMissingTableError(err) ||
    /does not exist|replica not|terminat|ECONNRESET|read ECONNRESET|ended with a non-zero|503|timeout/i.test(err.message)
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Supabase poolers route reads to replicas that can temporarily lag DDL/DML
// committed on the primary (seen on production as "relation ... does not
// exist" during provisioning). Ride over the lag window; never retry real
// failures so callers keep deterministic error behavior and rollbacks.
async function retryTransient(fn, { attempts = 3, baseDelayMs = 1500 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientDbError(err)) throw err;
      if (attempt < attempts) {
        console.warn(`[tenant] transient DB error during provisioning (${err.message}); retry ${attempt}/${attempts}`);
        await sleep(baseDelayMs * attempt);
      }
    }
  }
  throw lastErr;
}

async function ensureTenantSchemaReady(slug) {
  const seq = makeTenantSequelize(slug);
  try {
    const rows = await seq.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()`,
      { type: QueryTypes.SELECT }
    );
    const existing = new Set(rows.map((r) => String(r.table_name)));
    const missing = BUSINESS.filter((name) => !existing.has(name));

    if (missing.length > 0) {
      console.warn(`[tenant] Schema for ${slug} is stale: missing tables ${missing.join(', ')}`);
      return true;
    }
    return false;
  } catch (err) {
    console.warn(`[tenant] Read-only tenant schema check failed for ${slug}: ${err.message}`);
    return false;
  } finally {
    await seq.close();
  }
}

module.exports = {
  TENANT_PREFIX, BUSINESS, createSchema, dropTenantSchema, makeTenantSequelize,
  provisionCompany, getModels, setCache, getCache, syncAllTenants,
  syncAllTenants, ensureTenantSchemaReady, stripCrossDbUserRefs,
  isMissingTableError, isTransientDbError, retryTransient,
};