const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const { Company } = require("../models");
const tenantManager = require("../services/tenantManager");

// public list of active companies for the signup form
exports.getCompanies = asyncHandler(async (req, res) => {
  const rows = await Company.findAll({ where: { status: "active" }, attributes: ["id", "name", "slug"], order: [["name", "ASC"]] });
  res.json({ success: true, count: rows.length, data: rows });
});

exports.createCompany = asyncHandler(async (req, res, next) => {
  const { name, slug } = req.body;
  if (!name || !slug) return next(new ErrorResponse("name and slug are required", 400));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return next(new ErrorResponse("slug must match ^[a-z0-9][a-z0-9-]*$", 400));
  }
  const existing = await Company.findOne({ where: { slug } });
  if (existing) return next(new ErrorResponse("Company slug already exists", 400));

  const company = await Company.create({ name, slug, dbName: `${tenantManager.TENANT_PREFIX}${slug}`, status: "provisioning" });

  let provisioned = false;
  try {
    await tenantManager.provisionCompany(company);
    provisioned = true;
  } catch (err) {
    console.error("[createCompany] provisioning failed:", err.message);
    company.status = "provisioning";
    await company.save();
  }

  res.status(201).json({
    success: true,
    company: { id: company.id, name: company.name, slug: company.slug, status: provisioned ? "active" : "provisioning" },
    warning: provisioned ? undefined : "Workspace recorded but DB provisioning failed. Retry via resubmit.",
  });
});

exports.syncAll = asyncHandler(async (req, res) => {
  const result = await tenantManager.syncAllTenants();
  res.json({ success: true, ...result });
});