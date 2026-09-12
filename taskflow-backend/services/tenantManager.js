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

async function provisionCompany(company) {
  const dbName = `${TENANT_PREFIX}${company.slug}`;
  await createDatabase(dbName);
  const seq = makeSequelize(tenantConnectionString(dbName));
  const models = build(seq);
  for (const name of BUSINESS) {
    await models[name].sync({ alter: true });
  }
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
  for (const [slug, { models }] of instanceCache.entries()) {
    for (const name of BUSINESS) {
      await models[name].sync({ alter: true });
    }
    results.push(slug);
  }
  return { synced: results };
}

module.exports = {
  TENANT_PREFIX, BUSINESS, createDatabase, tenantConnectionString,
  provisionCompany, getModels, setCache, getCache, syncAllTenants,
};