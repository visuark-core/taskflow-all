const { Sequelize, QueryTypes } = require("sequelize");
const { build } = require("../models");
const makeSequelize = require("../utils/makeSequelize");

const TENANT_PREFIX = "taskflow_";
const BUSINESS = [
  "Department", "Team", "Project", "Client", "Service", "Invoice", "InvoiceItem",
  "Task", "Activity", "Message", "Notification", "SalaryDetail", "SalaryPayout",
  "Expense", "CompanyBillingSetting", "ProjectMember", "TeamMember", "DepartmentMember",
  "TaskComment", "TaskAttachment", "TaskLabel",
];

const instanceCache = new Map(); // slug -> { sequelize, models }

function ownerConnection() {
  return new Sequelize(process.env.TENANT_OWNER_DATABASE_URL, {
    dialect: "postgres",
    dialectModule: require("pg"),
    logging: false,
    pool: { max: 1, min: 0, idle: 500 },
  });
}

async function createDatabase(dbName) {
  const quoted = `"${dbName.replace(/"/g, '""')}"`;
  const owner = ownerConnection();
  try {
    const exists = await owner.query(
      `SELECT 1 FROM pg_database WHERE datname = :name`,
      { replacements: { name: dbName }, type: QueryTypes.SELECT }
    );
    if (exists.length === 0) {
      await owner.query(`CREATE DATABASE ${quoted}`);
    }
  } finally {
    await owner.close();
  }
}

function tenantConnectionString(dbName) {
  const ownerUrl = new URL(process.env.TENANT_OWNER_DATABASE_URL);
  ownerUrl.pathname = `/${dbName}`;
  return ownerUrl.toString();
}

// After schema sync, tenant DBs keep only business tables. Drop FK
// constraints referencing the global Users table (user rows live in the
// primary DB; IDs become loose references enforced by the application).
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
  const dbName = `${TENANT_PREFIX}${company.slug}`;
  await createDatabase(dbName);
  const seq = makeSequelize(tenantConnectionString(dbName));
  // Full schema sync so FK targets exist while tables are created.
  build(seq);
  await seq.sync({ alter: true });
  await stripCrossDbUserRefs(seq);
  await seq.close();
  await company.update({ status: "active", dbName });
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
  for (const [slug, { sequelize: seq }] of instanceCache.entries()) {
    await seq.sync({ alter: true });
    await stripCrossDbUserRefs(seq);
    results.push(slug);
  }
  return { synced: results };
}

module.exports = {
  TENANT_PREFIX, BUSINESS, createDatabase, tenantConnectionString,
  provisionCompany, getModels, setCache, getCache, syncAllTenants,
  stripCrossDbUserRefs,
};