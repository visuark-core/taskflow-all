# Per-Company Multi-Tenant Databases — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate each company's business data into its own Postgres database (`taskflow_<slug>`), auto-provisioned when an admin creates a workspace, while keeping a single global `Users` table for login.

**Architecture:** One shared **primary** database holds `Users` + a new `Companies` registry. Each **tenant** database (per company) holds the 20 business models. A `tenantRouter` middleware resolves `req.user.company` → cached per-company Sequelize instance → `req.tenant.models`; controllers read models from there instead of the global `require('../models')`. Because global `Users` live in a different database than tenant tables, all `include` of the `User` model in tenant queries is removed and replaced with a post-query "user enrichment" step that fetches user display fields from the primary DB. Company provisioning uses a DB-owner role (`TENANT_OWNER_DATABASE_URL`) capable of `CREATE DATABASE`.

**Tech Stack:** Node.js + Express, Sequelize 6 (pg), Postgres 18, Cloudinary, React/Vite frontend.

**Spec:** `docs/superpowers/specs/2026-09-12-multi-tenant-per-company-databases-design.md`

## Global Constraints

- Tenant databases are named `taskflow_<slug>`; slug must match `^[a-z0-9][a-z0-9-]*$` and is quoted in `CREATE DATABASE`.
- Tenant DBs sync ONLY the 20 business models (never `Users`, never `Companies`).
- Controllers never `include` the `User` model on tenant queries; user display fields come via `req.tenant.getUsers()`.
- Response shapes to the frontend must stay identical to today's (user objects still appear as `assignee`, `owner`, `sender`, etc.).
- Env additions: `TENANT_OWNER_DATABASE_URL` (DB owner, connect to `postgres` maintenance DB). `DATABASE_URL` becomes the primary/control DB.
- Companies registry rows: `status` `'provisioning'` | `'active'`. Registration only allowed for `status === 'active'`.
- Business model list (tenant sync set):
  `Department, Team, Project, Client, Service, Invoice, InvoiceItem, Task, Activity, Message, Notification, SalaryDetail, SalaryPayout, Expense, CompanyBillingSetting, ProjectMember, TeamMember, DepartmentMember, TaskComment, TaskAttachment, TaskLabel`
- Global-only models: `User`, `Company`.
- Local sandbox: per-user cluster `127.0.0.1:55432` (role `taskflow`/`taskflow`); grant `CREATEDB` to that role for local provisioning tests.

---

### Task 1: Convert model files to factories

**Files:**
- Modify: `taskflow-backend/models/{User,Department,Team,Project,Client,Service,Invoice,InvoiceItem,Task,Activity,Message,Notification,SalaryDetail,SalaryPayout,Expense,CompanyBillingSetting}.js`

**Interfaces:**
- Produces: each model file becomes `module.exports = (sequelize) => sequelize.define('X', {...})`.

- [ ] **Step 1: Convert each model file**

For every file in the list, apply this exact transformation. Example using `models/CompanyBillingSetting.js`:

Before:
```js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CompanyBillingSetting = sequelize.define("CompanyBillingSetting", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  company: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { notEmpty: true } },
  logoUrl: { type: DataTypes.STRING },
  signatureUrl: { type: DataTypes.STRING },
});

module.exports = CompanyBillingSetting;
```

After:
```js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define("CompanyBillingSetting", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  company: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { notEmpty: true } },
  logoUrl: { type: DataTypes.STRING },
  signatureUrl: { type: DataTypes.STRING },
});
```

Rules for every file:
- Delete the line `const sequelize = require("../config/db");`
- Change `const X = sequelize.define("X", {` → `module.exports = (sequelize) => sequelize.define("X", {`
- The trailing `});` becomes `})); it already ends with `});` for `define` — change the final `});` to `}));` is WRONG: keep the structure `module.exports = (sequelize) => sequelize.define("X", { ... });`
- Delete the old `module.exports = X;` line at the bottom.
- Keep any unrelated top-level imports (`bcryptjs`, `jsonwebtoken`, etc.) exactly as-is; a model file may run extra logic inside the factory (e.g. `User.prototype.getSignedJwtToken`). For `User.js`, wrap the class-style instance methods so they are defined inside the arrow returning the define call. Where `User.js` currently defines `User.prototype.xxx = ...` after `define`, move those assignments inside the factory body immediately after the `define`.

- [ ] **Step 2: Verify all factories load**

Run: `node -e "const fs=require('fs');for (const f of fs.readdirSync('models').filter(x=>x.endsWith('.js')&&x!=='index.js')){const m=require('./models/'+f);if(typeof m!=='function')throw new Error(f+' is not a factory');}console.log('all model files export factories')"`
Expected: `all model files export factories`

- [ ] **Step 3: Commit**

```bash
git add taskflow-backend/models
git commit -m "refactor: convert model files to sequelize-instance factories"
```

---

### Task 2: Rebuild `models/index.js` as a `build()` factory

**Files:**
- Modify: `taskflow-backend/models/index.js`
- Create: `taskflow-backend/models/Company.js`

**Interfaces:**
- Produces: `require('../models')` → `{ sequelize, User, Company, Department, ... , build }` where `build(sequelize) => { sequelize, ...allModels }` is a pure factory usable for tenant instances.

- [ ] **Step 1: Create `models/Company.js`**

```js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define("Company", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { is: /^[a-z0-9][a-z0-9-]*$/ } },
  dbHost: { type: DataTypes.STRING, allowNull: true },
  dbPort: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 5432 },
  dbName: { type: DataTypes.STRING, allowNull: false },
  status: {
    type: DataTypes.ENUM("provisioning", "active"),
    allowNull: false,
    defaultValue: "provisioning",
  },
});
```

- [ ] **Step 2: Rewrite `models/index.js`**

```js
const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

function build(sequelize) {
  const User = require("./User")(sequelize);
  const Company = require("./Company")(sequelize);
  const Department = require("./Department")(sequelize);
  const Team = require("./Team")(sequelize);
  const Project = require("./Project")(sequelize);
  const Client = require("./Client")(sequelize);
  const Service = require("./Service")(sequelize);
  const Invoice = require("./Invoice")(sequelize);
  const InvoiceItem = require("./InvoiceItem")(sequelize);
  const Task = require("./Task")(sequelize);
  const Activity = require("./Activity")(sequelize);
  const Message = require("./Message")(sequelize);
  const Notification = require("./Notification")(sequelize);
  const SalaryDetail = require("./SalaryDetail")(sequelize);
  const SalaryPayout = require("./SalaryPayout")(sequelize);
  const Expense = require("./Expense")(sequelize);
  const CompanyBillingSetting = require("./CompanyBillingSetting")(sequelize);

  const ProjectMember = sequelize.define("ProjectMember", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    role: { type: DataTypes.ENUM("viewer", "member", "admin"), defaultValue: "member" },
  });
  const TeamMember = sequelize.define("TeamMember", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    role: { type: DataTypes.ENUM("member", "lead", "admin"), defaultValue: "member" },
    joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  });
  const DepartmentMember = sequelize.define("DepartmentMember", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    role: { type: DataTypes.ENUM("member", "lead"), defaultValue: "member" },
    joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  });
  const TaskComment = sequelize.define("TaskComment", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    text: { type: DataTypes.TEXT, allowNull: false },
  });
  const TaskAttachment = sequelize.define("TaskAttachment", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    filename: { type: DataTypes.STRING, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
  });
  const TaskLabel = sequelize.define("TaskLabel", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: DataTypes.STRING,
    color: DataTypes.STRING,
  });

  // --- Assocations (identical to today's relationships; User stays defined
  // so FK columns like ownerId/assigneeId/senderId are still created by sync;
  // controllers must NOT include User on tenant queries) ---
  User.belongsTo(Department, { as: "managedDepartment", foreignKey: "managedDepartmentId" });
  Department.hasOne(User, { as: "manager", foreignKey: "managedDepartmentId" });
  User.belongsTo(User, { as: "reportingManager", foreignKey: "reportingManagerId" });
  User.belongsToMany(Team, { through: TeamMember, foreignKey: "UserId", otherKey: "TeamId" });
  Team.belongsToMany(User, { as: "members", through: TeamMember, foreignKey: "TeamId", otherKey: "UserId" });
  Team.belongsTo(User, { as: "owner", foreignKey: "ownerId" });
  Department.belongsTo(User, { as: "departmentManager", foreignKey: "managerId" });
  Department.belongsTo(User, { as: "createdBy", foreignKey: "createdById" });
  Team.belongsTo(Department, { foreignKey: "departmentId" });
  Department.hasMany(Team, { foreignKey: "departmentId" });
  Department.belongsToMany(User, { as: "members", through: DepartmentMember });
  User.belongsToMany(Department, { as: "departments", through: DepartmentMember });
  Project.belongsTo(User, { as: "owner", foreignKey: "ownerId" });
  User.hasMany(Project, { foreignKey: "ownerId" });
  Project.belongsTo(Team, { foreignKey: "teamId" });
  Team.hasMany(Project, { foreignKey: "teamId" });
  Project.belongsTo(Client, { as: "client", foreignKey: "clientId" });
  Client.hasMany(Project, { as: "projects", foreignKey: "clientId" });
  Project.belongsTo(Service, { as: "service", foreignKey: "serviceId" });
  Service.hasMany(Project, { as: "projects", foreignKey: "serviceId" });
  Project.belongsToMany(User, { as: "members", through: ProjectMember });
  User.belongsToMany(Project, { as: "projects", through: ProjectMember });
  Task.belongsTo(Project, { foreignKey: "projectId" });
  Project.hasMany(Task, { foreignKey: "projectId" });
  Task.belongsTo(User, { as: "assignee", foreignKey: "assigneeId" });
  Task.belongsTo(User, { as: "assignedBy", foreignKey: "assignedById" });
  User.hasMany(Task, { foreignKey: "assigneeId" });
  Task.hasMany(TaskComment, { as: "comments", foreignKey: "taskId" });
  TaskComment.belongsTo(Task, { foreignKey: "taskId" });
  TaskComment.belongsTo(User, { foreignKey: "userId" });
  Task.hasMany(TaskAttachment, { as: "attachments", foreignKey: "taskId" });
  TaskAttachment.belongsTo(Task, { foreignKey: "taskId" });
  Task.hasMany(TaskLabel, { as: "labels", foreignKey: "taskId" });
  TaskLabel.belongsTo(Task, { foreignKey: "taskId" });
  Activity.belongsTo(User, { foreignKey: "userId" });
  Activity.belongsTo(Project, { foreignKey: "projectId" });
  Activity.belongsTo(Task, { foreignKey: "taskId" });
  Message.belongsTo(User, { as: "sender", foreignKey: "senderId" });
  Message.belongsTo(User, { as: "recipient", foreignKey: "recipientId" });
  Notification.belongsTo(User, { as: "recipient", foreignKey: "recipientId" });
  Notification.belongsTo(Project, { as: "relatedProject", foreignKey: "relatedProjectId" });
  Notification.belongsTo(Task, { as: "relatedTask", foreignKey: "relatedTaskId" });
  Invoice.belongsTo(Project, { foreignKey: "projectId", as: "project" });
  Project.hasMany(Invoice, { foreignKey: "projectId", as: "invoices" });
  Invoice.belongsTo(Client, { foreignKey: "clientId", as: "client" });
  Client.hasMany(Invoice, { foreignKey: "clientId", as: "invoices" });
  InvoiceItem.belongsTo(Invoice, { foreignKey: "invoiceId", as: "invoice", onDelete: "CASCADE" });
  Invoice.hasMany(InvoiceItem, { foreignKey: "invoiceId", as: "items", onDelete: "CASCADE" });
  SalaryDetail.belongsTo(User, { as: "user", foreignKey: "userId" });
  User.hasOne(SalaryDetail, { as: "salaryDetail", foreignKey: "userId", onDelete: "CASCADE" });
  SalaryPayout.belongsTo(User, { as: "user", foreignKey: "userId" });
  User.hasMany(SalaryPayout, { as: "salaryPayouts", foreignKey: "userId", onDelete: "CASCADE" });
  Expense.belongsTo(User, { as: "addedBy", foreignKey: "addedById" });
  User.hasMany(Expense, { as: "expenses", foreignKey: "addedById", onDelete: "CASCADE" });

  return {
    sequelize, User, Company, Department, Team, Project, Client, Service,
    Invoice, InvoiceItem, Task, Activity, Message, Notification,
    SalaryDetail, SalaryPayout, Expense, CompanyBillingSetting,
    ProjectMember, TeamMember, DepartmentMember, TaskComment, TaskAttachment, TaskLabel,
  };
}

const models = build(sequelize);

module.exports = {
  ...models,
  sequelize,
  build,
};
```

> Note: the six join/sub models previously had no `id` PK (composite through tables). This task adds an `id` PK to each so `sync({ alter: true })` and row copies work cleanly. This is a deliberate schema change for tenant DBs; it syncs into the primary DB too (harmless).

- [ ] **Step 3: Verify primary still boots**

Run: `node -e "const m=require('./models');console.log('User',!!m.User,'Company',!!m.Company,'Team',!!m.Team,'build' in m)"`
Expected: `User true Company true Team true build in m` → `true`

- [ ] **Step 4: Commit**

```bash
git add taskflow-backend/models/index.js taskflow-backend/models/Company.js
git commit -m "feat: add Company registry model and make models build() factory"
```

---

### Task 3: Connection factory + tenant manager service

**Files:**
- Create: `taskflow-backend/utils/makeSequelize.js`
- Create: `taskflow-backend/services/tenantManager.js`

**Interfaces:**
- Produces:
  - `makeSequelize(connectionUri, { max }) -> Sequelize` (reuses SSL/pool logic from `config/db.js`)
  - `tenantManager.provisionCompany(name, slug) -> { id, slug, dbName, status }`
  - `tenantManager.getSequelize(slug) -> Sequelize` (cached per slug)
  - `tenantManager.getModels(slug) -> { sequelize, models }` (cached)
  - `tenantManager.syncAllTenants() -> { synced: [slug] }`
  - `tenantManager.BUSINESS = [ ...model names ]`

- [ ] **Step 1: Create `utils/makeSequelize.js`**

```js
const { Sequelize } = require("sequelize");
const pg = require("pg");

module.exports = function makeSequelize(connectionUri, poolMax = 2) {
  const useSsl = !/localhost|127\.0\.0\.1|::1/.test(connectionUri.split("@").pop() || connectionUri);
  const dialectOptions = useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {};
  return new Sequelize(connectionUri, {
    dialect: "postgres",
    dialectModule: pg,
    dialectOptions,
    logging: false,
    pool: { max: poolMax, min: 0, acquire: 10000, idle: 2000, evict: 2000 },
  });
};
```

- [ ] **Step 2: Create `services/tenantManager.js`**

```js
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
  if (instanceCache.has(slug)) return instanceCache.get(slug);
  const company = null; // caller ensures company row access via getTenantDb
  throw new Error("tenant not preloaded: " + slug);
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
```

> `provisionCompany` is idempotent: `CREATE DATABASE` is skipped if the DB already exists; status gets set to `active` on success, so a failed run can be retried (step 3 in the company controller re-calls it).

- [ ] **Step 3: Commit**

```bash
git add taskflow-backend/utils/makeSequelize.js taskflow-backend/services/tenantManager.js
git commit -m "feat: tenant connection factory and provisioning manager"
```

---

### Task 4: Tenant router middleware

**Files:**
- Create: `taskflow-backend/middlewares/tenantRouter.js`

**Interfaces:**
- Produces: `tenantRouter` middleware. After it runs, `req.tenant = { slug, dbName, models, getUsers(ids, attrs) }`, where `getUsers` returns `Promise<{ [globalUserId]: {id,name,avatar,email} }>` from the primary `User` model. Errors: 400 if `req.user.company` is missing/unknown; 503 if provisioning in progress or DB unreachable.

- [ ] **Step 1: Create `middlewares/tenantRouter.js`**

```js
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const { User } = require("../models");
const makeSequelize = require("../utils/makeSequelize");
const { build } = require("../models");
const { tenantConnectionString, TENANT_PREFIX, BUSINESS, setCache, getCache } = require("../services/tenantManager");

async function resolveSequelize(slug, dbName) {
  const cached = getCache(slug);
  if (cached) return cached;
  const sequelize = makeSequelize(tenantConnectionString(dbName));
  const models = build(sequelize);
  const entry = { sequelize, models };
  setCache(slug, entry);
  return entry;
}

const tenantRouter = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.company) {
    return next(new ErrorResponse("Company is required to access this resource", 400));
  }

  const company = await CompanyLookup(req.user.company);
  if (!company) {
    return next(new ErrorResponse("Your company is not registered", 400));
  }
  if (company.status !== "active") {
    return next(new ErrorResponse("Your company workspace is still being provisioned. Try again shortly.", 503));
  }

  const entry = await resolveSequelize(company.slug, company.dbName);

  req.tenant = {
    slug: company.slug,
    dbName: company.dbName,
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
function CompanyLookup(slug) {
  const { Company } = require("../models");
  return Company.findOne({ where: { slug } });
}

module.exports = tenantRouter;
```

Add top-of-file near imports (the `Company` import cannot be destructured at top with `User` because `../models` already loaded once; keep the lazy `CompanyLookup` helper as shown).

- [ ] **Step 2: Verify no circular-require crash on boot**

Run: `export LC_ALL=C; node -e "require('./middlewares/tenantRouter');console.log('tenantRouter loads')"` (from `taskflow-backend`)
Expected: `tenantRouter loads`

- [ ] **Step 3: Commit**

```bash
git add taskflow-backend/middlewares/tenantRouter.js
git commit -m "feat: tenant router middleware resolving req.tenant models"
```

---

### Task 5: Companies controller + routes, register validation

**Files:**
- Create: `taskflow-backend/controllers/companyController.js`
- Create: `taskflow-backend/routes/companies.js`
- Modify: `taskflow-backend/app.js`, `taskflow-backend/controllers/authController.js`

**Interfaces:**
- Produces:
  - `GET /api/companies` (public) → `{ success, data: [{id,name,slug}] }` (active only)
  - `POST /api/companies` (`protect` + `authorize('admin')`) → `{ company }` with `{ name, slug }` body; provisions DB
  - `POST /api/companies/sync-all` (admin) → `{ synced: [...] }`
  - `register` rejects any company that is not an `active` Companies row.

- [ ] **Step 1: Create `controllers/companyController.js`**

```js
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
```

- [ ] **Step 2: Create `routes/companies.js`**

```js
const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const { getCompanies, createCompany, syncAll } = require("../controllers/companyController");
const router = express.Router();

router.get("/", getCompanies);
router.post("/", protect, authorize("admin"), createCompany);
router.post("/sync-all", protect, authorize("admin"), syncAll);

module.exports = router;
```

- [ ] **Step 3: Require + mount in `app.js`**

Add import near line 25:
```js
const companyRoutes = require('./routes/companies');
```
Add mount near line 143:
```js
app.use('/api/companies', companyRoutes);
```

- [ ] **Step 4: Validate company on register in `controllers/authController.js`**

Replace the top with:
```js
const { User, Team, Company } = require('../models');
```
Replace the register body validation block (lines 9-19) with:
```js
const { name, email, password, company, role, department } = req.body;
if (!company) {
  return next(new ErrorResponse('Company name is required', 400));
}
const companyRow = await Company.findOne({ where: { slug: company, status: 'active' } });
if (!companyRow) {
  return next(new ErrorResponse('This company has not been provisioned. Ask your admin to create the workspace first.', 400));
}
```

> Note: `company` in the register payload becomes the **slug** of a Company (not a free-text name). The frontend task (Task 10) sends `company: selectedCompany.slug`.

- [ ] **Step 5: Local boot check**

Run: `export LC_ALL=C; PORT=5002 node -e "require('./app').ready.then(()=>{console.log('app boots');process.exit(0)}).catch(e=>{console.error(e.message);process.exit(1)})"` (from `taskflow-backend`)
Expected: `app boots`

- [ ] **Step 6: Commit**

```bash
git add taskflow-backend/controllers/companyController.js taskflow-backend/routes/companies.js taskflow-backend/app.js taskflow-backend/controllers/authController.js
git commit -m "feat: company workspace provisioning endpoints and register validation"
```

---

### Task 6: Wire `tenantRouter` into protected routes

**Files:**
- Modify: `taskflow-backend/routes/{projects,clients,services,invoices,tasks,teams,departments,activities,notifications,reports,chat,salaries,billingSettings}.js` (13 files)

**Interfaces:**
- Consumes: Task 4 `tenantRouter`
- Produces: every protected route chain has `tenantRouter` applied after `protect` so `req.tenant` is set in handlers.

- [ ] **Step 1: Add import + middleware to each route file**

In each of the 13 route files, after the existing `const { protect, authorize } = require('../middlewares/auth');` (or wherever `protect` is imported), add:

```js
const tenantRouter = require('../middlewares/tenantRouter');
```

Then, for **every** route handler chain that currently begins with `protect`, insert `tenantRouter` directly after `protect` (before any `authorize(...)`). Example for `routes/tasks.js`:

Before:
```js
router.get('/my', protect, getAllTasks);
```
After:
```js
router.get('/my', protect, tenantRouter, getAllTasks);
```

For chains like `router.post('/', protect, authorize('admin'), createTask)` change to:
```js
router.post('/', protect, tenantRouter, authorize('admin'), createTask);
```

Do not touch `/api/auth` (global User only) or `/api/users` (global User management) — except the tenant-dependent user endpoints handled in Task 7. For `routes/billingSettings.js`, add `tenantRouter` after `protect` before `authorizeFinance`.

- [ ] **Step 2: Verify route lists via grep**

Run: `export LC_ALL=C; grep -rn "protect," routes/ | grep -v "tenantRouter"` (from `taskflow-backend`)
Expected: matches only in `routes/auth.js` and `routes/users.js`

- [ ] **Step 3: Commit**

```bash
git add taskflow-backend/routes
git commit -m "feat: apply tenantRouter to all protected business routes"
```

---

### Task 7: Convert auth.me, salaries, billing settings (group A)

**Files:**
- Modify: `taskflow-backend/controllers/authController.js` (`getMe` only), `taskflow-backend/controllers/salaryController.js`, `taskflow-backend/controllers/billingSettingsController.js`, `taskflow-backend/routes/notifications.js`, `taskflow-backend/routes/reports.js`

**Interfaces:**
- Consumes: Task 6 (`req.tenant` present)
- Produces: group-A controllers read tenant models from `req.tenant.models`; user display fields enriched via `req.tenant.getUsers`.

- [ ] **Step 1: Rewrite `getMe` in `controllers/authController.js`**

Replace the existing `getMe` implementation:
```js
exports.getMe = asyncHandler(async (req, res, next) => {
  const { Team, TeamMember } = (req.tenant && req.tenant.models) || require("../models");
  const userJson = req.user.toJSON();
  let teams = [];
  if (req.tenant) {
    teams = await Team.findAll({
      include: [{ model: TeamMember, where: { UserId: req.user.id } }],
    });
  }
  res.status(200).json({ success: true, data: { ...userJson, teams } });
});
```
Add `tenantRouter` to `/me` in `routes/auth.js`:
```js
const tenantRouter = require('../middlewares/tenantRouter');
router.get('/me', protect, tenantRouter, getMe);
```

- [ ] **Step 2: Convert `controllers/salaryController.js`**

Replace the file so every handler resolves models from `req.tenant.models` and drops `where: { company: req.user.company }`. The resulting handlers look like:
```js
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const { Op } = require("sequelize");

exports.getSalaries = asyncHandler(async (req, res, next) => {
  const { SalaryDetail, User } = req.tenant.models;
  const salaries = await SalaryDetail.findAll({});
  const ids = salaries.map((s) => s.userId);
  const users = await req.tenant.getUsers(ids);
  const data = salaries.map((s) => ({ ...s.toJSON(), user: users[s.userId] || null }));
  res.status(200).json({ success: true, count: data.length, data });
});
```
Keep the original filtering logic (status, range, etc.) identical except: remove `where: { company: req.user.company }`; replace every `{ model: User, ... }` include with a `req.tenant.getUsers(...)` enrichment as shown. Update the other handlers (create/update/delete, payouts) the same way — they keep `userId` fields but reference `req.tenant.models.SalaryDetail` / `SalaryPayout`.

- [ ] **Step 3: Convert `controllers/billingSettingsController.js`**

- Replace `const models = require('../models')` / destructured imports with:
```js
const models = req.tenant.models;
```
- The `CompanyBillingSetting` queries now use `req.tenant.models.CompanyBillingSetting`, and the "company" scoping disappears (the tenant DB is the boundary). Keep `findOrCreate` keyed on a constant:
```js
const [setting] = await models.CompanyBillingSetting.findOrCreate({
  where: { company: req.tenant.slug },
  defaults: { company: req.tenant.slug },
});
```
- Cloudinary folders gain the tenant slug: change `taskflow/billing-logos` → `taskflow/${req.tenant.slug}/billing-logos` and `taskflow/billing-signatures` → `taskflow/${req.tenant.slug}/billing-signatures`.

- [ ] **Step 4: Convert inline model use in `routes/notifications.js` and `routes/reports.js`**

These two route files `require('../models')` directly inside handlers. Convert every `const X = require('../models')` inside a handler to read from `req.tenant.models` (they already sit behind `protect`); ensure their chains include `tenantRouter` (done in Task 6) and wrap inline handlers with `asyncHandler` already present. Replace `const { sequelize } = require('../models')` queries (if any) with `req.tenant.models.sequelize`.

- [ ] **Step 5: Local smoke test**

Run: `export LC_ALL=C; node --check controllers/salaryController.js && node --check controllers/billingSettingsController.js && node --check controllers/authController.js`
Expected: no output (syntax OK)

- [ ] **Step 6: Commit**

```bash
git add taskflow-backend/controllers taskflow-backend/routes
git commit -m "feat: tenant-aware auth.me, salaries, billing settings"
```

---

### Task 8: User-enrichment recipe + convert task & project controllers (group B)

**Files:**
- Modify: `taskflow-backend/controllers/taskController.js`, `taskflow-backend/controllers/projectController.js`

**Interfaces:**
- Consumes: `req.tenant.models`, `req.tenant.getUsers`
- Produces: group-B controllers return the same response shapes but source data from the tenant DB.

**The enrichment recipe (use verbatim in every task below, including Task 9):**
1. `const { TenantModel } = req.tenant.models;`
2. Query WITHOUT any `include` of `User`.
3. Collect the user ids referenced: e.g. `const ids = rows.map(r => r.assigneeId);`
4. `const userMap = await req.tenant.getUsers(ids);`
5. Attach: `rows.forEach(r => r.setDataValue('assignee', userMap[r.assigneeId] || null));`

- [ ] **Step 1: Convert `controllers/taskController.js`**

Apply the recipe at each site. Concretely:

- `getAllTasks` / `getTasks` / `getMyTasks`: the three `include`s of `User as assignee` → remove that include (keep `Project`, `labels` includes). After `findAll`, add:
```js
const userMap = await req.tenant.getUsers(tasks.map((t) => t.assigneeId));
tasks.forEach((t) => tasks.forEach = undefined); // (do not use this line)
tasks.forEach((t) => t.setDataValue("assignee", userMap[t.assigneeId] || null));
```
- `getTask`: remove `User as assignee`, `User as assignedBy`, and the `User` include inside `comments`. After fetching, enrich:
```js
const uidMap = await req.tenant.getUsers([task.assigneeId, task.assignedById, ...task.comments.map((c) => c.userId)]);
task.setDataValue("assignee", uidMap[task.assigneeId] || null);
task.setDataValue("assignedBy", uidMap[task.assignedById] || null);
task.comments.forEach((c) => c.setDataValue("user", uidMap[c.userId] || null));
```
- `createTask`/`updateTask`/`deleteTask`/`reorderTasks`/`addComment`/`addAttachment`/`deleteAttachment`: change the top-line destructure to
```js
const { Task, Project, Activity, TaskComment, TaskAttachment, TaskLabel } = req.tenant.models;
```
and keep all logic identical (the `updateProjectStatus` helper must take `models`):
```js
const updateProjectStatus = async (models, projectId) => { const { Project, Task } = models; ... }
```
call it as `updateProjectStatus(req.tenant.models, task.projectId)`. `addAttachment`: also namespace the Cloudinary folder → `taskflow/${req.tenant.slug}/attachments`.

- [ ] **Step 2: Convert `controllers/projectController.js`**

Apply the same recipe. Notable sites:
- `getProjects`: remove the `User as owner`, `User as members`, `Client.company` attribute stays; keep `Team`, `Client`, `Service` includes. After `findAll`, collect `ownerId` and member ids:
```js
const memberIds = projects.flatMap((p) => p.members ? p.members.map((m) => m.id) : []);
const ownerIds = projects.map((p) => p.ownerId);
const userMap = await req.tenant.getUsers([...ownerIds, ...memberIds]);
projects.forEach((p) => {
  p.setDataValue("owner", userMap[p.ownerId] || null);
  if (p.members) p.members = p.members.map((m) => userMap[m.id] || m);
});
```
- `getProject` (single): remove User includes; enrich `owner` and `members` from `getUsers`.
- `createProject`: destructure `const { Project, Activity } = req.tenant.models;` and remove `company: req.user.company` from the create payload (the tenant DB is the boundary).
- All other handlers (update/delete, team member queries): swap top-line destructure to `req.tenant.models`.

- [ ] **Step 3: Syntax check**

Run: `export LC_ALL=C; node --check controllers/taskController.js && node --check controllers/projectController.js`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add taskflow-backend/controllers/taskController.js taskflow-backend/controllers/projectController.js
git commit -m "feat: tenant-aware task and project controllers with user enrichment"
```

---

### Task 9: Convert remaining controllers (group C)

**Files:**
- Modify: `taskflow-backend/controllers/{clientController,serviceController,teamController,departmentController,activityController,notificationController,chatController,reportController,invoiceController,userController}.js`

**Interfaces:**
- Consumes: Task 8 enrichment recipe
- Produces: all remaining business controllers read `req.tenant.models` and never `include` `User`.

- [ ] **Step 1: `clientController.js`, `serviceController.js`**

Both are simple CRUD on tenant tables with no User includes:
```js
exports.getAllClients = asyncHandler(async (req, res, next) => {
  const { Client } = req.tenant.models;
  const clients = await Client.findAll();
  res.json({ success: true, count: clients.length, data: clients });
});
```
Apply to all handlers; drop top-line `require('../models')`.

- [ ] **Step 2: `teamController.js`, `departmentController.js`**

Team/Department members go through the join tables. For member lists, use the tenant join model and enrich via `getUsers`:
```js
const { TeamMember } = req.tenant.models;
const members = await TeamMember.findAll({ where: { TeamId: teamId } });
const userMap = await req.tenant.getUsers(members.map((m) => m.UserId));
const enriched = members.map((m) => ({ ...m.toJSON(), member: userMap[m.UserId] || null }));
```
Apply the recipe to every User-include site in both files. `owner`/`manager`/`createdBy` enrichment follows the same `getUsers` pattern as Task 8.

- [ ] **Step 3: `activityController.js`, `notificationController.js`, `chatController.js`**

- `activityController`: destructure `Activity` from `req.tenant.models`; the `Activity.belongsTo(User, foreignKey: 'userId')` include → enrich `user` per recipe.
- `notificationController`: destructure from `req.tenant.models`; `recipient` include → `const userMap = await req.tenant.getUsers(notifs.map(n => n.recipientId)); notifs.forEach(n => n.setDataValue('recipient', userMap[n.recipientId] || null));`
- `chatController`: `Message` + `sender`/`recipient` includes → enrich both by id. Keep `io` emit logic unchanged.

- [ ] **Step 4: `reportController.js`, `invoiceController.js`**

- `reportController`: any aggregation queries move to `req.tenant.models.sequelize` (e.g. `const { sequelize } = req.tenant.models; sequelize.query(...)`). Replace all `require('../models')` usages.
- `invoiceController`: destructure `Invoice, InvoiceItem, Project, Client` from `req.tenant.models`; the `Client.company` attribute on includes stays (business field); enrich any `User` includes with `getUsers`.

- [ ] **Step 5: `userController.js` global-only cleanup**

`userController.js` manages global `Users` (list/create/update/delete, avatar). It stays on `require('../models').User` — but any endpoint that returns tenant data (e.g. a "team members" or "my projects" list) must switch to `req.tenant.models` with the recipe. Audit each handler; only the avatar upload folder should change → `taskflow/${req.tenant?.slug || 'global'}/avatars`.

- [ ] **Step 6: Syntax check**

Run: `export LC_ALL=C; for f in controllers/{clientController,serviceController,teamController,departmentController,activityController,notificationController,chatController,reportController,invoiceController,userController}.js; do node --check "$f" || exit 1; done`
Expected: no output

- [ ] **Step 7: Commit**

```bash
git add taskflow-backend/controllers
git commit -m "feat: tenant-aware remaining controllers with user enrichment"
```

---

### Task 10: Frontend — company select on signup

**Files:**
- Modify: `tailwind-frontend/src/components/auth/SignupForm.tsx`

**Interfaces:**
- Consumes: `GET /api/companies` (public)
- Produces: signup posts `company: selectedCompany.slug`

- [ ] **Step 1: Fetch active companies on mount**

```tsx
const [companies, setCompanies] = useState<{ id: number; name: string; slug: string }[]>([]);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
useEffect(() => {
  fetch(`${API_URL}/api/companies`)
    .then((r) => r.json())
    .then((d) => setCompanies(d.data || []))
    .catch(() => setCompanies([]));
}, []);
```
Add `useEffect` to the imports from `'react'`.

- [ ] **Step 2: Replace the company text input with a select**

Replace the `<input id="company" ... />` block (lines 86-96) with:
```tsx
<select
  id="company"
  value={company}
  onChange={(e) => setCompany(e.target.value)}
  className="block w-full pl-3 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white"
>
  <option value="">Select your company</option>
  {companies.map((c) => (
    <option key={c.id} value={c.slug}>{c.name}</option>
  ))}
</select>
{companies.length === 0 && (
  <p className="text-xs text-amber-600 dark:text-amber-400">
    No company workspaces available yet. Ask your admin to create one.
  </p>
)}
```

- [ ] **Step 3: Keep `handleSubmit` posting `company` (now the slug)**

No change needed to `handleSubmit` — it already sends `company`; it now carries the slug. Update the `validateForm` message parity: it reads "Company name is required" — change text to "Select your company".

- [ ] **Step 4: Build + typecheck**

Run: `npm run build` and `npx tsc --noEmit` (from `tailwind-frontend`)
Expected: build succeeds; no new tsc errors beyond the pre-existing unused-import set.

- [ ] **Step 5: Commit**

```bash
git add tailwind-frontend/src/components/auth/SignupForm.tsx
git commit -m "feat: signup selects from provisioned company workspaces"
```

---

### Task 11: Migration script for existing data

**Files:**
- Create: `taskflow-backend/migrate-tenants.js`

**Interfaces:**
- Consumes: primary models; per-company provisioning (`tenantManager`)
- Produces: one Companies row per distinct `User.company`; each gets a provisioned DB; business rows copied per company.

**Attribution rule:** determine a row's company by FK to a user: `Project.owner → User.company`; `Task → Project → owner`; `Client → createdById → User.company`; `Invoice → clientId → (client’s company)`; `Salary* → userId → company`; `Expense → addedById → company`; `Activity → userId → company`; `Message → senderId → company`; `Notification → recipientId → company`; `Team → ownerId → company`; `Department → managerId or createdById → company`; `Service → createdById?` (absent → primary). Rows that cannot be resolved go to the primary company (the `Company` with the most users).

- [ ] **Step 1: Write `migrate-tenants.js`**

```js
const dotenv = require("dotenv"); dotenv.config();
const { sequelize, User, build } = require("./models");
const makeSequelize = require("./utils/makeSequelize");
const tenantManager = require("./services/tenantManager");
const { Op } = require("sequelize");

async function main() {
  const users = await User.findAll({ attributes: ["id", "company"] });
  const byCompany = {};
  for (const u of users) {
    const slug = String(u.company || "default").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "default";
    (byCompany[slug] = byCompany[slug] || []).push(u.id);
  }
  const primary = Object.entries(byCompany).sort((a, b) => b[1].length - a[1].length)[0]?.[0] || "default";

  for (const [slug, userIds] of Object.entries(byCompany)) {
    let company = await require("./models").Company.findOne({ where: { slug } });
    if (!company) {
      company = await require("./models").Company.create({ name: slug, slug, dbName: `${tenantManager.TENANT_PREFIX}${slug}`, status: "provisioning" });
    }
    await tenantManager.provisionCompany(company);

    const tSeq = makeSequelize(tenantManager.tenantConnectionString(company.dbName));
    const tModels = build(tSeq);
    await copyModel(tModels, "Client", userIds, primary, slug);
    await copyModel(tModels, "Project", userIds, primary, slug);
    await copyModel(tModels, "Task", userIds, primary, slug);
    await copyModel(tModels, "Team", userIds, primary, slug);
    await copyModel(tModels, "Department", userIds, primary, slug);
    await copyModel(tModels, "Service", userIds, primary, slug);
    await copyModel(tModels, "Invoice", userIds, primary, slug);
    await copyModel(tModels, "InvoiceItem", userIds, primary, slug);
    await copyModel(tModels, "SalaryDetail", userIds, primary, slug);
    await copyModel(tModels, "SalaryPayout", userIds, primary, slug);
    await copyModel(tModels, "Expense", userIds, primary, slug);
    await copyModel(tModels, "Activity", userIds, primary, slug);
    await copyModel(tModels, "Message", userIds, primary, slug);
    await copyModel(tModels, "Notification", userIds, primary, slug);
    await copyModel(tModels, "CompanyBillingSetting", userIds, primary, slug);
    await copyModel(tModels, "ProjectMember", userIds, primary, slug);
    await copyModel(tModels, "TeamMember", userIds, primary, slug);
    await copyModel(tModels, "DepartmentMember", userIds, primary, slug);
    await copyModel(tModels, "TaskComment", userIds, primary, slug);
    await copyModel(tModels, "TaskAttachment", userIds, primary, slug);
    await copyModel(tModels, "TaskLabel", userIds, primary, slug);
    await tSeq.close();
    console.log(`Migrated ${slug} (${userIds.length} users)`);
  }
  await sequelize.close();
}

async function copyModel(tModels, name, userIds, primary, slug) {
  const src = require("./models")[name];
  const dst = tModels[name];
  if (!src || !dst) return;
  const rows = await src.findAll();
  let filtered = rows;
  // per-model attribution via foreign user-ish column (best-effort; see plan rules)
  const ownerKey = { Project: "ownerId", Task: null, Client: "createdById", Invoice: "clientId",
    SalaryDetail: "userId", SalaryPayout: "userId", Expense: "addedById", Activity: "userId",
    Message: "senderId", Notification: "recipientId", Team: "ownerId",
    Department: "createdById", Service: null, ProjectMember: "UserId", TeamMember: "UserId",
    DepartmentMember: "UserId", TaskComment: "userId", TaskAttachment: "taskId", TaskLabel: "taskId" }[name];
  if (ownerKey) {
    filtered = rows.filter((r) => userIds.includes(r[ownerKey]) || (name === "CompanyBillingSetting"));
  } else {
    filtered = slug === primary ? rows : [];
  }
  // child tables follow parent by FK
  if (name === "TaskAttachment" || name === "TaskLabel" || name === "TaskComment") {
    const taskIds = await require("./models").Task.findAll({ where: { id: { [Op.in]: filtered.map((r) => r.taskId) } }, attributes: ["id"] });
    filtered = filtered.filter((r) => taskIds.length === 0); // conservative: only line items with tasks copied above
  }
  if (filtered.length === 0) return;
  await dst.bulkCreate(filtered.map((r) => r.toJSON()), { ignoreDuplicates: true });
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

> Run this ONCE against a copy/backup of production before rollout. It is best-effort on child rows; its purpose is to move existing test data so the app's deployed users have company contexts after cutover. Verify counts printed per slug match expectations.

- [ ] **Step 2: Verify script loads**

Run: `export LC_ALL=C; node --check migrate-tenants.js`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add taskflow-backend/migrate-tenants.js
git commit -m "feat: one-time migration script to per-company databases"
```

---

### Task 12: Local end-to-end provisioning test + env/docs

**Files:**
- Modify: `taskflow-backend/.env` (add `TENANT_OWNER_DATABASE_URL`), `README.md` (env table row)
- Create: `taskflow-backend/test-provision.js`

**Interfaces:**
- Produces: proves two companies get isolated databases with identical schemas and no cross-reads.

- [ ] **Step 1: Grant CREATEDB to the local role**

Run: `export LC_ALL=C; psql -h 127.0.0.1 -p 55432 -U tony -d postgres -c "ALTER ROLE taskflow CREATEDB;"`
Expected: `ALTER ROLE`

Add to `taskflow-backend/.env`:
```
TENANT_OWNER_DATABASE_URL=postgres://taskflow:taskflow@127.0.0.1:55432/postgres
```

- [ ] **Step 2: Create `test-provision.js`**

```js
const dotenv = require("dotenv"); dotenv.config();
const { Company } = require("./models");
const tenantManager = require("./services/tenantManager");
const { build } = require("./models");

async function main() {
  const clean = await Company.destroy({ where: { slug: ["acme", "globex"] } });
  const c1 = await Company.create({ name: "Acme", slug: "acme", dbName: "taskflow_acme", status: "provisioning" });
  const c2 = await Company.create({ name: "Globex", slug: "globex", dbName: "taskflow_globex", status: "provisioning" });
  await tenantManager.provisionCompany(c1);
  await tenantManager.provisionCompany(c2);

  const t1 = build(tenantManager.getSequelize = null || require("./utils/makeSequelize")(tenantManager.tenantConnectionString("taskflow_acme")));
  await t1.Client.create({ name: "Acme Client Only" });
  const t2 = build(makeSequelize2(tenantManager.tenantConnectionString("taskflow_globex")));

  const makeSequelize2 = require("./utils/makeSequelize");
  const acmeClients = await t1.Client.findAll();
  const globexClients = await t2.Client.findAll();
  console.assert(acmeClients.length === 1 && acmeClients[0].name === "Acme Client Only", "acme has its client");
  console.assert(globexClients.length === 0, "globex sees nothing");

  const { sequelize: s1 } = t1, { sequelize: s2 } = t2;
  const [hasUsers] = await s1.query("SELECT to_regclass('public.Users') AS t;");
  console.assert(hasUsers[0].t === null, "tenant DB has no Users table");
  await s1.close(); await s2.close();
  console.log("ISOLATION TEST PASSED (cleanup:", clean, ")");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

Fix orded of declarations: move `const makeSequelize2 = require("./utils/makeSequelize");` to the top of `main` (before use) and remove the erroneous `getSequelize` reference. The test must (1) provision two companies, (2) insert a client in acme only, (3) assert globex has zero clients, (4) assert no `Users` table exists in either tenant DB.

- [ ] **Step 3: Run the isolation test**

Run: `export LC_ALL=C; node test-provision.js` (from `taskflow-backend`, after `npm ci` deps are present)
Expected: `ISOLATION TEST PASSED`

- [ ] **Step 4: Document env in `README.md`**

Add rows to the backend env table (create the table if missing):
```
| TENANT_OWNER_DATABASE_URL | postgres://dbowner:pass@host:5432/postgres | DB-owner role with CREATE DATABASE privilege; tenant provisioning |
| DATABASE_URL | postgres://.../postgres | Primary/control DB (Users + Companies) |
```

- [ ] **Step 5: Commit**

```bash
git add taskflow-backend/.env README.md taskflow-backend/test-provision.js
git commit -m "feat: local multi-tenant provisioning isolation test"
```

---

### Task 13: End-start integration sweep

**Files:**
- Many (no new files)

**Interfaces:**
- Consumes: all previous tasks
- Produces: app boots, `/api/companies` returns the registry, signup+tenant routing work, `/api/db-sync` still syncs primary, `POST /api/companies/sync-all` syncs tenants.

- [ ] **Step 1: Reboot backend and smoke every endpoint group**

Run:
```bash
export LC_ALL=C; PORT=5001 node server.js &
```
Then against `http://localhost:5001`:
1. `POST /api/companies` `{"name":"TestCorp","slug":"testcorp"}` with an admin token → `status: active`
2. `POST /api/auth/register` with `company: "testcorp"` → 201
3. `GET /api/clients` with the new user's token → `{ success: true, data: [] }`
4. `POST /api/clients` → creates in `taskflow_testcorp` only
5. Login as a `globex` user → `GET /api/clients` → does NOT include testcorp's client

Expected: each assertion holds; tenants are isolated.

- [ ] **Step 2: Run full lint/typecheck**

Run (backend): `for f in controllers/*.js middlewares/*.js services/*.js utils/*.js routes/*.js; do node --check "$f" || exit 1; done`
Run (frontend): `npm run build && npx tsc --noEmit` (from `tailwind-frontend`)
Expected: all pass; only the known pre-existing tsc unused-import errors remain.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: end-to-end multi-tenant isolation"
```

---

### Post-plan (not tasks): production rollout

- Choose a DB host with `CREATE DATABASE` capability (self-hosted cluster like the local one, or Neon/Railway/DO). Put its owner URL in Vercel `TENANT_OWNER_DATABASE_URL` and repoint `DATABASE_URL` to the new primary.
- Run `SYNC_DIRECT=1 node sync-db.js` against the new primary (creates `Companies`).
- Run `node migrate-tenants.js` once against a backup to move existing data.
- Note: the frontend toggle for company badge + the full UI redesign are separate follow-on efforts (spec'd separately).