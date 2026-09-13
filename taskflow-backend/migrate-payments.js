const dotenv = require("dotenv");
dotenv.config();
const tenantManager = require("./services/tenantManager");
const { build } = require("./models");
const { QueryTypes, Sequelize } = require("sequelize");
const normalizeSupabaseUri = require("./utils/normalizeSupabaseUri");

/* One-off backfill: for every invoice already marked 'paid' that has no
   payment rows, create a full-amount payment entry so the payments
   history is consistent.  Run: node migrate-payments.js */

async function listTenantSchemas() {
  const uri = normalizeSupabaseUri(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  if (!uri) throw new Error("DATABASE_URL is required");
  const probe = new Sequelize(uri, { dialect: "postgres", dialectModule: require("pg"), logging: false });
  try {
    const rows = await probe.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE '${tenantManager.TENANT_PREFIX}%'`,
      { type: QueryTypes.SELECT }
    );
    return rows.map(r => r.schema_name.replace(tenantManager.TENANT_PREFIX, ""));
  } finally {
    await probe.close();
  }
}

async function backfillOne(slug) {
  const seq = tenantManager.makeTenantSequelize(slug);
  const models = build(seq);
  const { Invoice, InvoicePayment } = models;

  const invoices = await Invoice.findAll({ where: { status: "paid" } });
  let created = 0;
  for (const inv of invoices) {
    const count = await InvoicePayment.count({ where: { invoiceId: inv.id } });
    if (count > 0) continue;
    await InvoicePayment.create({
      invoiceId: inv.id,
      amount: inv.totalAmount,
      paymentDate: inv.updatedAt || new Date(),
      method: "other",
      note: "Backfilled from existing paid invoice"
    });
    created++;
  }
  await seq.close();
  return { slug, created };
}

async function main() {
  const slugs = await listTenantSchemas();
  if (slugs.length === 0) {
    console.log("No tenant schemas found.");
    return;
  }
  for (const slug of slugs) {
    try {
      const res = await backfillOne(slug);
      console.log(`Backfilled ${res.slug}: ${res.created} payment(s)`);
    } catch (e) {
      console.error(`Failed ${slug}:`, e.message);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });