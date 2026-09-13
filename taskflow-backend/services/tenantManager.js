const { Sequelize, QueryTypes } = require("sequelize");
const { build } = require("../models");
const makeSequelize = require("../utils/makeSequelize");
const normalizeSupabaseUri = require("../utils/normalizeSupabaseUri");

const TENANT_PREFIX = "taskflow_";
const BUSINESS = [
  "Department", "Team", "Project", "Client", "Service", "Invoice", "InvoiceItem",
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
  await createSchema(slug);
  const seq = makeTenantSequelize(slug);
  build(seq);
  await seq.sync({ alter: true });
  await stripCrossDbUserRefs(seq);
  await seq.close();
  await company.update({ status: "active", dbName: `${TENANT_PREFIX}${slug}` });
  return await company.reload();
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

module.exports = {
  TENANT_PREFIX, BUSINESS, createSchema, dropTenantSchema, makeTenantSequelize,
  provisionCompany, getModels, setCache, getCache, syncAllTenants,
  stripCrossDbUserRefs,
};