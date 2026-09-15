const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const { User } = require("../models");
const { build } = require("../models");
const tenantManager = require("../services/tenantManager");
const slugify = require("../utils/slugify");

async function resolveSequelize(slug) {
  const cached = tenantManager.getCache(slug);
  if (cached) return cached;
  const sequelize = tenantManager.makeTenantSequelize(slug);
  const models = build(sequelize);
  const entry = { sequelize, models };
  tenantManager.setCache(slug, entry);
  return entry;
}

const tenantRouter = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.company) {
    return next(new ErrorResponse("Company is required to access this resource", 400));
  }

  const companySlug = slugify(req.user.company) || req.user.company;
  const company = await CompanyLookup(companySlug);
  if (!company) {
    return next(new ErrorResponse("Your company is not registered", 400));
  }
  if (company.status !== "active") {
    return next(new ErrorResponse("Your company workspace is still being provisioned. Try again shortly.", 503));
  }

  const entry = await resolveSequelize(company.slug);

  req.tenant = {
    slug: company.slug,
    dbName: company.dbName,
    sequelize: entry.sequelize,
    models: entry.models,
    async getUsers(ids, attributes = ["id", "name", "avatar"]) {
      const unique = [...new Set((ids || []).filter(Boolean))];
      if (unique.length === 0) return {};
      const rows = await User.findAll({ where: { id: unique }, attributes });
      const map = {};
      for (const r of rows) map[r.id] = r.toJSON();
      return map;
    },
  };
  next();
});

// Company registry lookup (lazy require to avoid circular import at boot)
async function CompanyLookup(slug) {
  const { Company } = require("../models");
  const ensurePrimarySchema = require("../utils/ensurePrimarySchema");
  try {
    return await Company.findOne({ where: { slug } });
  } catch (err) {
    // On a fresh deployment the Companies table may not exist yet (serverless
    // cold start raced the boot sync). Self-heal once, then let errors surface.
    if (/relation "Companies" does not exist/i.test(err.message)) {
      await ensurePrimarySchema();
      return Company.findOne({ where: { slug } });
    }
    throw err;
  }
}

module.exports = tenantRouter;