const sequelize = require("../config/db");
const { QueryTypes } = require("sequelize");

const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@visuark.com').trim().toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';
const DEFAULT_ADMIN_COMPANY = (process.env.DEFAULT_ADMIN_COMPANY || 'Visuark').trim();
const DEFAULT_ADMIN_DEPARTMENT = (process.env.DEFAULT_ADMIN_DEPARTMENT || 'management').trim();

// The bootstrap admin is tenanted like every other user, so it needs a
// Companies registry row too. Without one, tenantRouter rejects every
// request with "Your company is not registered" (400). Register the row
// on first bootstrap; on legacy deployments where the tenant workspace
// already exists this just backfills the registry entry without touching
// the existing business tables.
async function ensureAdminCompany(deps = {}) {
  const Company = deps.Company || require("../models").Company;
  const tenantManager = deps.tenantManager || require("../services/tenantManager");
  const db = deps.sequelize || sequelize;
  const queryTypes = deps.QueryTypes || QueryTypes;

  const slug = String(DEFAULT_ADMIN_COMPANY).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "visuark";

  const attemptLookup = async () => {
    const company = await Company.findOne({ where: { slug } });
    if (company) {
      // If the row is stuck at "provisioning" but the schema already exists,
      // mark it active so tenant requests stop returning 503.
      if (company.status !== "active") {
        const schema = `${tenantManager.TENANT_PREFIX}${slug}`;
        const rows = await db.query(
          `SELECT to_regclass(${db.escape(`${schema}."Projects"`)}) AS projects`,
          { type: queryTypes.SELECT }
        );
        if (rows[0] && rows[0].projects) {
          await company.update({ status: "active" });
          return company.reload();
        }
      }
      return company;
    }

    const schema = `${tenantManager.TENANT_PREFIX}${slug}`;
    const rows = await db.query(
      `SELECT to_regclass(${db.escape(`${schema}."Projects"`)}) AS projects,
              to_regclass(${db.escape(`${schema}."Tasks"`)}) AS tasks`,
      { type: queryTypes.SELECT }
    );
    const alreadyProvisioned = !!(rows[0] && rows[0].projects && rows[0].tasks);

    const companyRow = await Company.create({
      name: DEFAULT_ADMIN_COMPANY,
      slug,
      dbName: schema,
      status: alreadyProvisioned ? "active" : "provisioning",
    });

    if (!alreadyProvisioned) {
      await tenantManager.provisionCompany(companyRow);
    }
    return companyRow;
  };

  try {
    return await attemptLookup();
  } catch (err) {
    if (/relation "Companies" does not exist/i.test(err.message)) {
      const ensurePrimarySchema = deps.ensurePrimarySchema || require("./ensurePrimarySchema");
      await ensurePrimarySchema();
      return attemptLookup();
    }
    if (err.name === "SequelizeUniqueConstraintError" || /unique|duplicate/i.test(err.message)) {
      const existing = await Company.findOne({ where: { slug } });
      if (existing) return existing;
    }
    throw err;
  }
}

async function ensureDefaultAdmin(UserModel, deps = {}) {
  const User = UserModel || require("../models").User;
  const company = await ensureAdminCompany(deps);

  const hasUser = await User.count();
  if (hasUser > 0) {
    const existing = await User.findOne({
      where: sequelize.where(
        sequelize.fn('lower', sequelize.col('email')),
        '=',
        DEFAULT_ADMIN_EMAIL
      )
    });

    if (existing) {
      return { created: false, user: existing, company };
    }

    return { created: false, user: null, company };
  }

  const admin = await User.create({
    name: 'TaskFlow Admin',
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
    company: company.slug,
    role: 'admin',
    department: DEFAULT_ADMIN_DEPARTMENT,
    isActive: true,
  });

  return { created: true, user: admin, company };
}

module.exports = {
  ensureDefaultAdmin,
  ensureAdminCompany,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_COMPANY,
};