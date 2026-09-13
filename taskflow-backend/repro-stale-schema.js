require("dotenv").config();
const tenantManager = require("./services/tenantManager");
const { build } = require("./models");

const SLUG = "probrepro";

(async () => {
  // 1) Create tenant schema (like at signup via provisionCompany).
  await tenantManager.createSchema(SLUG);

  // 2) Build models, then sync all BUSINESS tables EXCEPT InvoicePayment.
  //    This simulates an old tenant schema: Invoices/InvoiceItems exist,
  //    but InvoicePayments table does NOT exist (pre-dates this feature).
  const seq = tenantManager.makeTenantSequelize(SLUG);
  const legacy = build(seq);
  const business = [
    "Department", "Team", "Project", "Client", "Service",
    "Invoice", "InvoiceItem"
  ];
  for (const name of business) {
    await legacy[name].sync();
  }
  // Note: InvoicePayment table was never synced → it is absent.

  // 3) List tables to confirm InvoicePayments is missing
  const tables = (await seq.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'taskflow_${SLUG}'`,
    { type: require("sequelize").QueryTypes.SELECT }
  )).map(r => r.table_name).sort().join(", ");
  console.log("tables in legacy schema:", tables);

  // 5) Run the EXACT query getInvoices runs now (deployed code) against the legacy schema.
  try {
    await legacy.Invoice.findAll({
      include: [{ model: legacy.InvoicePayment, as: "payments" }]
    });
    console.log("RESULT: query succeeded (unexpected)");
  } catch (err) {
    console.log("RESULT: query FAILED (expected, simulates production 500)");
    console.log("  error name:", err.name);
    console.log("  message:", err.message);
  } finally {
    await tenantManager.dropTenantSchema(SLUG);
    await seq.close();
  }
})().then(() => process.exit(0)).catch((e) => { console.error("REPRO SCRIPT ERROR:", e.message); process.exit(1); });