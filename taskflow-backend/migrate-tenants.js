const dotenv = require("dotenv");
dotenv.config();
const { sequelize, User, Company } = require("./models");
const makeSequelize = require("./utils/makeSequelize");
const tenantManager = require("./services/tenantManager");

/* One-off migration for existing single-DB data.
   Run against a copy/backup of production before the multi-tenant cutover:
     node migrate-tenants.js
   Best-effort: splits current business rows into per-company tenant DBs
   using the attribution rules below. Child rows whose parent is missing
   fall through to whichever company their FK resolves to, else primary. */

function slugify(s) {
  return String(s || "default")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

async function main() {
  const users = await User.findAll({ attributes: ["id", "company"] });
  const userCompany = {};
  for (const u of users) userCompany[u.id] = slugify(u.company);
  const byCompany = {};
  for (const [uid, slug] of Object.entries(userCompany)) {
    (byCompany[slug] = byCompany[slug] || []).push(Number(uid));
  }
  const slugs = Object.keys(byCompany);
  if (slugs.length === 0) {
    console.log("No users found; nothing to migrate.");
    await sequelize.close();
    return;
  }
  const primary = [...slugs].sort((a, b) => byCompany[b].length - byCompany[a].length)[0];

  // Attribute FK hierarchy so child rows can resolve their company.
  const clients = await require("./models").Client.findAll();
  const clientCompany = {};
  for (const c of clients) clientCompany[c.id] = userCompany[c.createdById] || primary;

  const projects = await require("./models").Project.findAll();
  const projectCompany = {};
  for (const p of projects) projectCompany[p.id] = userCompany[p.ownerId] || primary;

  const tasks = await require("./models").Task.findAll();
  const taskCompany = {};
  for (const t of tasks) taskCompany[t.id] = projectCompany[t.projectId] || primary;

  const invoices = await require("./models").Invoice.findAll();
  const invoiceCompany = {};
  for (const inv of invoices) invoiceCompany[inv.id] = clientCompany[inv.clientId] || primary;

  const teams = await require("./models").Team.findAll();
  const teamCompany = {};
  for (const t of teams) teamCompany[t.id] = userCompany[t.ownerId] || primary;

  const departments = await require("./models").Department.findAll();
  const departmentCompany = {};
  for (const d of departments) departmentCompany[d.id] = userCompany[d.managerId] || userCompany[d.createdById] || primary;

  // name -> predicate deciding whether a source row belongs to this slug.
  const simpleKey = {
    Client: "createdById",
    Project: "ownerId",
    Task: null,
    Invoice: "clientId",
    SalaryDetail: "userId",
    SalaryPayout: "userId",
    Expense: "addedById",
    Activity: "userId",
    Message: "senderId",
    Notification: "recipientId",
    Team: "ownerId",
    Department: "createdById",
  };

  async function copyModel(tModels, name, slug) {
    const src = require("./models")[name];
    const dst = tModels[name];
    if (!src || !dst) return 0;
    const rows = await src.findAll();
    let kept;
    if (name === "Client") {
      kept = rows.filter(r => clientCompany[r.id] === slug);
    } else if (name === "Project") {
      kept = rows.filter(r => projectCompany[r.id] === slug);
    } else if (name === "Task") {
      kept = rows.filter(r => taskCompany[r.id] === slug);
    } else if (name === "Invoice") {
      kept = rows.filter(r => invoiceCompany[r.id] === slug);
    } else if (name === "Team") {
      kept = rows.filter(r => teamCompany[r.id] === slug);
    } else if (name === "Department") {
      kept = rows.filter(r => departmentCompany[r.id] === slug);
    } else if (name === "Service") {
      kept = slug === primary ? rows : [];
    } else if (name === "CompanyBillingSetting") {
      kept = rows.filter(r => slugify(r.company) === slug || (slug === primary && !r.company));
    } else if (name === "InvoiceItem") {
      kept = rows.filter(r => invoiceCompany[r.invoiceId] === slug);
    } else if (name === "TaskComment" || name === "TaskAttachment" || name === "TaskLabel") {
      kept = rows.filter(r => taskCompany[r.taskId] === slug);
    } else if (name === "ProjectMember") {
      kept = rows.filter(r => userCompany[r.UserId] === slug);
    } else if (name === "TeamMember") {
      kept = rows.filter(r => userCompany[r.UserId] === slug);
    } else if (name === "DepartmentMember") {
      kept = rows.filter(r => userCompany[r.UserId] === slug);
    } else if (simpleKey[name]) {
      kept = rows.filter(r => userCompany[r[simpleKey[name]]] === slug);
    } else {
      kept = [];
    }
    if (kept.length === 0) return 0;
    await dst.bulkCreate(kept.map(r => r.toJSON()), { ignoreDuplicates: true });
    return kept.length;
  }

  for (const slug of slugs) {
    const userIds = byCompany[slug];
    let company = await Company.findOne({ where: { slug } });
    if (!company) {
      company = await Company.create({
        name: slug,
        slug,
        dbName: `${tenantManager.TENANT_PREFIX}${slug}`,
        status: "provisioning",
      });
    }
    await tenantManager.provisionCompany(company);

    const tSeq = makeSequelize(tenantManager.tenantConnectionString(company.dbName));
    const tModels = require("./models").build(tSeq);

    const counts = {};
    for (const name of tenantManager.BUSINESS) {
      counts[name] = await copyModel(tModels, name, slug);
    }
    await tSeq.close();
    console.log(`Migrated ${slug} (${userIds.length} users):`, JSON.stringify(counts));
  }

  await sequelize.close();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });