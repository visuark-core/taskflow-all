# Invoice Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add payment tracking to invoices — register full or partial (instalment) payments, auto-flip invoice to `paid` when fully paid, and remove the manual "Mark Paid" button.

**Architecture:** New `InvoicePayment` model (per-tenant, like `SalaryPayout`) belongs to `Invoice`. Payment create/delete handlers recompute the running total and set invoice status server-side (full → `paid`, partial → stay, delete → revert). Frontend Billing page gets a Payments tab, Paid/Remaining columns, and a payments section in the invoice detail drawer. A one-off script backfills full payment rows for already-`paid` invoices.

**Tech Stack:** Node/Express/Sequelize (Postgres, per-tenant schemas), React+TypeScript/Vite, axios, lucide-react, Redux.

**Spec:** `docs/superpowers/specs/2026-09-13-invoice-payments-design.md`

## Global Constraints

- Amounts are FLOAT — compare with epsilon `0.01`; settle when `remaining <= 0.01`.
- Manual `status: 'paid'` via `PUT /api/invoices/:id` is blocked server-side; payment flow is the only path to `paid`.
- No new `partial` status. Partial invoices stay `draft`/`sent`/`overdue`.
- All model access via `req.tenant.models` (never global models) in controllers.
- New model name added to `tenantManager.BUSINESS` so per-tenant `sync({ alter: true })` creates its table.
- Currency formatting uses `₹` + `toLocaleString('en-IN', ...)`.
- Backend has NO test infra — verification is `node --check`, `npm run build`, boot test, and manual API calls.
- Follow existing code style: no comments unless the file already has them; existing files use named function style loosely matching surrounding code.

---

### Task 1: InvoicePayment model + registration

**Files:**
- Create: `taskflow-backend/models/InvoicePayment.js`
- Modify: `taskflow-backend/models/index.js` (require + association + return object)
- Modify: `taskflow-backend/services/tenantManager.js:7-12` (BUSINESS array)

**Interfaces:**
- Produces: `InvoicePayment` model with fields `id`, `invoiceId` (FK, not null), `amount` (FLOAT, not null, min 0.01), `paymentDate` (DATE, default NOW), `method` (ENUM `upi|bank|cash|cheque|other`, default `other`), `note` (TEXT). Association `Invoice.hasMany(InvoicePayment, { as: 'payments', foreignKey: 'invoiceId', onDelete: 'CASCADE' })` and `InvoicePayment.belongsTo(Invoice, { as: 'invoice', foreignKey: 'invoiceId' })`.
- Model exported as `InvoicePayment` on the `build()` return object.

- [ ] **Step 1: Create the model file**

`taskflow-backend/models/InvoicePayment.js`:
```js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define("InvoicePayment", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    paymentDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    method: {
      type: DataTypes.ENUM("upi", "bank", "cash", "cheque", "other"),
      defaultValue: "other",
    },
    note: {
      type: DataTypes.TEXT,
    },
  });
```

- [ ] **Step 2: Register model in models/index.js**

In `taskflow-backend/models/index.js`:
- After line 13 (`const InvoiceItem = require("./InvoiceItem")(sequelize);`) add:
```js
const InvoicePayment = require("./InvoicePayment")(sequelize);
```
- In the associations block, after line 150 (`Invoice.hasMany(InvoiceItem, ...)`) add:
```js
InvoicePayment.belongsTo(Invoice, { foreignKey: "invoiceId", as: "invoice", onDelete: "CASCADE" });
Invoice.hasMany(InvoicePayment, { foreignKey: "invoiceId", as: "payments", onDelete: "CASCADE" });
```
- In the return object (line 159-163), add `InvoicePayment` next to `InvoiceItem`:
```js
Invoice, InvoiceItem, InvoicePayment,
```

- [ ] **Step 3: Add to tenantManager.BUSINESS**

In `taskflow-backend/services/tenantManager.js:7-12`, add `"InvoicePayment"` after `"InvoiceItem"`:
```js
const BUSINESS = [
  "Department", "Team", "Project", "Client", "Service", "Invoice", "InvoiceItem", "InvoicePayment",
  ...
];
```

- [ ] **Step 4: Verify model loads**

Run: `node --check models/InvoicePayment.js && node --check models/index.js && node --check services/tenantManager.js`
Expected: no output (exit 0).

Run: `node -e "const m=require('./models'); console.log('InvoicePayment' in m, Boolean(m.InvoicePayment))"`
Expected: `true true`

- [ ] **Step 5: Commit**

```bash
git add taskflow-backend/models/InvoicePayment.js taskflow-backend/models/index.js taskflow-backend/services/tenantManager.js
git commit -m "feat: add InvoicePayment model and register in tenant schemas"
```

---

### Task 2: Payment API handlers + status guard

**Files:**
- Modify: `taskflow-backend/controllers/invoiceController.js` (add `getInvoicePayments`, `addInvoicePayment`, `deleteInvoicePayment`; block `status:'paid'` in `updateInvoice`)
- Modify: `taskflow-backend/routes/invoices.js`

**Interfaces:**
- Consumes: `InvoicePayment` model from `req.tenant.models` (Task 1).
- Produces:
  - `GET /api/invoices/:id/payments` → `{ success: true, data: InvoicePayment[] }` ordered `paymentDate DESC, createdAt DESC`.
  - `POST /api/invoices/:id/payments` body `{ amount, paymentDate, method, note }` → 201 `{ success: true, data: { payment, paidAmount, remaining, invoiceStatus } }`.
  - `DELETE /api/invoices/:id/payments/:paymentId` → `{ success: true, data: { paidAmount, remaining, invoiceStatus } }`.
  - `PUT /api/invoices/:id` ignores/refuses `status: 'paid'`.
- Helper exposed at module scope for reuse: `async function settleInvoiceStatus(sequelize, models, invoiceId, transaction)` — recomputes sum of payments, sets status accordingly, returns `{ paidAmount, remaining, status }`. Must handle epsilon.

- [ ] **Step 1: Add a shared payment-settlement helper**

At the bottom of `taskflow-backend/controllers/invoiceController.js` add:
```js
const PAYMENT_EPSILON = 0.01;

function paymentTotals(invoice, payments) {
  const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, Number(invoice.totalAmount) - paidAmount);
  return { paidAmount, remaining };
}

async function settleInvoiceStatus(invoice, payments, transaction) {
  const { paidAmount, remaining } = paymentTotals(invoice, payments);
  let status = invoice.status;
  if (remaining <= PAYMENT_EPSILON) {
    status = 'paid';
  } else if (invoice.status === 'paid') {
    const due = new Date(invoice.dueDate).getTime();
    status = due < Date.now() ? 'overdue' : 'sent';
  }
  if (status !== invoice.status) {
    await invoice.update({ status }, transaction ? { transaction } : undefined);
  }
  return { paidAmount, remaining, invoiceStatus: status };
}
```

- [ ] **Step 2: Add payment handlers**

Append to `taskflow-backend/controllers/invoiceController.js` before the module exports end:
```js
// @desc    Get payments for an invoice
// @route   GET /api/invoices/:id/payments
// @access  Private (Finance)
exports.getInvoicePayments = asyncHandler(async (req, res, next) => {
  const { Invoice, InvoicePayment } = req.tenant.models;
  const invoice = await Invoice.findByPk(req.params.id);
  if (!invoice) return next(new ErrorResponse('Invoice not found', 404));

  const payments = await InvoicePayment.findAll({
    where: { invoiceId: invoice.id },
    order: [['paymentDate', 'DESC'], ['createdAt', 'DESC']]
  });

  res.status(200).json({ success: true, count: payments.length, data: payments });
});

// @desc    Record a payment against an invoice
// @route   POST /api/invoices/:id/payments
// @access  Private (Finance)
exports.addInvoicePayment = asyncHandler(async (req, res, next) => {
  const { Invoice, InvoicePayment } = req.tenant.models;
  const invoice = await Invoice.findByPk(req.params.id);
  if (!invoice) return next(new ErrorResponse('Invoice not found', 404));

  if (invoice.status === 'cancelled') {
    return next(new ErrorResponse('Cannot record payment on a cancelled invoice', 400));
  }
  if (invoice.status === 'paid') {
    return next(new ErrorResponse('Invoice is already fully paid', 400));
  }

  const amount = parseFloat(req.body.amount);
  if (!amount || isNaN(amount) || amount <= 0) {
    return next(new ErrorResponse('Payment amount must be greater than 0', 400));
  }

  const existing = await InvoicePayment.findAll({ where: { invoiceId: invoice.id } });
  const { remaining } = paymentTotals(invoice, existing);
  if (amount - remaining > PAYMENT_EPSILON) {
    return next(new ErrorResponse(`Payment amount exceeds remaining balance of ₹${remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400));
  }

  const t = await req.tenant.sequelize.transaction();
  try {
    const payment = await InvoicePayment.create({
      invoiceId: invoice.id,
      amount,
      paymentDate: req.body.paymentDate || new Date(),
      method: req.body.method || 'other',
      note: req.body.note
    }, { transaction: t });

    const payments = await InvoicePayment.findAll({ where: { invoiceId: invoice.id }, transaction: t });
    const totals = await settleInvoiceStatus(invoice, payments, t);
    await t.commit();

    res.status(201).json({ success: true, data: { payment, ...totals } });
  } catch (err) {
    await t.rollback();
    return next(new ErrorResponse(err.message || 'Failed to record payment', 500));
  }
});

// @desc    Delete a payment from an invoice
// @route   DELETE /api/invoices/:id/payments/:paymentId
// @access  Private (Finance)
exports.deleteInvoicePayment = asyncHandler(async (req, res, next) => {
  const { Invoice, InvoicePayment } = req.tenant.models;
  const invoice = await Invoice.findByPk(req.params.id);
  if (!invoice) return next(new ErrorResponse('Invoice not found', 404));

  const payment = await InvoicePayment.findOne({
    where: { id: req.params.paymentId, invoiceId: invoice.id }
  });
  if (!payment) return next(new ErrorResponse('Payment not found', 404));

  const t = await req.tenant.sequelize.transaction();
  try {
    await payment.destroy({ transaction: t });
    const payments = await InvoicePayment.findAll({ where: { invoiceId: invoice.id }, transaction: t });
    const totals = await settleInvoiceStatus(invoice, payments, t);
    await t.commit();
    res.status(200).json({ success: true, data: totals });
  } catch (err) {
    await t.rollback();
    return next(new ErrorResponse(err.message || 'Failed to delete payment', 500));
  }
});
```

- [ ] **Step 3: Block direct `status:'paid'` in updateInvoice**

In `taskflow-backend/controllers/invoiceController.js`, `updateInvoice` (line ~156), add at the top after `if (!invoice) { return next(...); }`:
```js
if (status === 'paid' && invoice.status !== 'paid') {
  return next(new ErrorResponse('Set status to paid by recording payments against the invoice', 400));
}
```
This relies on the destructured `status` already declared at line 172. If `status` is `undefined` (not passed), the guard is skipped — correct.

- [ ] **Step 4: Register payment routes**

In `taskflow-backend/routes/invoices.js`, extend the destructured imports and add routes. Modify lines 2-8:
```js
const {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoicePayments,
  addInvoicePayment,
  deleteInvoicePayment
} = require('../controllers/invoiceController');
```
Add after line 19 (`router.get('/:id', getInvoice);`):
```js
router.get('/:id/payments', getInvoicePayments);
router.post(
  '/:id/payments',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'),
  addInvoicePayment
);
router.delete(
  '/:id/payments/:paymentId',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'),
  deleteInvoicePayment
);
```

- [ ] **Step 5: Verify syntax + boot**

Run: `node --check controllers/invoiceController.js && node --check routes/invoices.js`
Expected: no output (exit 0).

Run: `node -e "const app=require('./app'); console.log('app loads')"` (if this opens a server/DB, instead run a short timeout):
`timeout 8 node -e "require('./app'); setTimeout(()=>process.exit(0), 3000)" 2>&1 | tail -3`
Expected: server reaches "listening" or boots without a syntax error.

- [ ] **Step 6: Commit**

```bash
git add taskflow-backend/controllers/invoiceController.js taskflow-backend/routes/invoices.js
git commit -m "feat: invoice payment APIs with auto-paid settlement and status guard"
```

---

### Task 3: Backfill migration for already-paid invoices

**Files:**
- Create: `taskflow-backend/migrate-payments.js`

**Interfaces:**
- Runs standalone: `node migrate-payments.js`. Iterates `tenantManager.BUSINESS`-style tenant schemas (reuses the pattern from `migrate-tenants.js`), and for each tenant invoice with `status='paid'` and zero `InvoicePayment` rows, inserts one full `totalAmount` payment.
- Produces console summary `{ slug, created }`.

**Note:** This script should discover tenants by scanning the database for schemas matching `taskflow_%` (not just the in-memory `instanceCache`, since caching only happens after a request). Sequelize can list schemas via `information_schema.schemata`.

- [ ] **Step 1: Write the script**

`taskflow-backend/migrate-payments.js`:
```js
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
```

- [ ] **Step 2: Verify syntax**

Run: `node --check migrate-payments.js`
Expected: no output (exit 0).

- [ ] **Step 3: Dry-run on dev/any reachable DB (optional)** — If a DATABASE_URL is configured locally, run `node migrate-payments.js` and confirm it prints per-tenant lines without throwing.

- [ ] **Step 4: Commit**

```bash
git add taskflow-backend/migrate-payments.js
git commit -m "feat: backfill script for paid invoices without payment history"
```

---

### Task 4: Frontend types + Paid/Remaining columns + Payments tab

**Files:**
- Modify: `tailwind-frontend/src/pages/Billing.tsx`

**Interfaces:**
- Consumes nothing new from prior tasks beyond the API — data comes from `GET /api/invoices` which will be updated in Task 5 to include `payments`.
- Produces: `paymentTotals(inv)` helper `{ paid, remaining }`; `PaymentMethod` union; `InvoicePayment` interface; `activeTab` extended to `'invoices' | 'services' | 'payments'`; a `filteredPayments` list.

- [ ] **Step 1: Add types**

In `tailwind-frontend/src/pages/Billing.tsx`, after the `InvoiceItem` interface (line 62 area) add:
```ts
type PaymentMethod = 'upi' | 'bank' | 'cash' | 'cheque' | 'other';

interface InvoicePayment {
  id: number;
  invoiceId: number;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  note?: string;
  createdAt: string;
}
```
In the `Invoice` interface (lines 83-99), add:
```ts
payments?: InvoicePayment[];
```

- [ ] **Step 2: Add paymentTotals helper + extend activeTab type**

After `filteredInvoices` (line ~589), add:
```ts
const paymentTotals = (inv: Invoice): { paid: number; remaining: number } => {
  const paid = (inv.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, Number(inv.totalAmount) - paid);
  return { paid, remaining };
};
```
Change line 112 from:
```ts
const [activeTab, setActiveTab] = useState<'invoices' | 'services'>('invoices');
```
to:
```ts
const [activeTab, setActiveTab] = useState<'invoices' | 'services' | 'payments'>('invoices');
```

- [ ] **Step 3: Add Payments tab button**

In the tab controls block (after the "Services Catalog" button, ~line 660), add:
```tsx
<button
  onClick={() => setActiveTab('payments')}
  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
    activeTab === 'payments'
      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
  }`}
>
  Payments
</button>
```

- [ ] **Step 4: Add Paid/Remaining columns to invoices table**

In the `<thead>` row (lines 741-749), after "Total Amount" header add:
```tsx
<th className="px-6 py-4 text-right">Paid</th>
<th className="px-6 py-4 text-right">Remaining</th>
```
In the row mapping `filteredInvoices.map((inv) => ...)` (line 752), after the Total Amount cell (find the `₹${inv.totalAmount.toLocaleString('en-IN', ...)}` cell, ~line 782) add two cells:
```tsx
<td className="px-6 py-4 text-right font-semibold text-green-600 dark:text-green-400">
  ₹{paymentTotals(inv).paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
</td>
<td className="px-6 py-4 text-right font-semibold text-red-600 dark:text-red-400">
  ₹{paymentTotals(inv).remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
</td>
```

- [ ] **Step 5: Build + verify**

Run: `npm run build` in `tailwind-frontend`
Expected: build succeeds (only the chunk-size warning may appear).

- [ ] **Step 6: Commit**

```bash
git add tailwind-frontend/src/pages/Billing.tsx
git commit -m "feat: payment columns and Payments tab in billing UI"
```

---

### Task 5: Fetch payments in invoice queries

**Files:**
- Modify: `taskflow-backend/controllers/invoiceController.js` (`getInvoices`, `getInvoice` include arrays)

**Interfaces:**
- Produces: `GET /api/invoices` and `GET /api/invoices/:id` responses include `payments: InvoicePayment[]` on each invoice so the frontend can compute paid/remaining without extra requests.

- [ ] **Step 1: Add payments to both includes**

In `getInvoices` (line 16-24) include block add:
```js
{ model: InvoicePayment, as: 'payments' }
```
Destructure `InvoicePayment` in that handler (line 8) and in `getInvoice` (line 37). Add the same include in `getInvoice` (lines 38-44) and in the `createInvoice`/`updateInvoice` refetch blocks (lines 134-140 and 242-248) so the returned invoice always carries payments.

- [ ] **Step 2: Verify syntax + boot**

Run: `node --check controllers/invoiceController.js`
Expected: exit 0.
Run: `timeout 8 node -e "require('./app'); setTimeout(()=>process.exit(0), 3000)" 2>&1 | tail -3`
Expected: boots without error.

- [ ] **Step 3: Commit**

```bash
git add taskflow-backend/controllers/invoiceController.js
git commit -m "feat: include payments in invoice list and detail responses"
```

---

### Task 6: Payments section in invoice detail drawer

**Files:**
- Modify: `tailwind-frontend/src/pages/Billing.tsx`

**Interfaces:**
- Consumes: `POST /api/invoices/:id/payments` (Task 2) returning `{ success, data: { payment, paidAmount, remaining, invoiceStatus } }`; `DELETE /api/invoices/:id/payments/:paymentId` returning totals.
- Produces: local `paymentsRefresh` state; `handleAddPayment`, `handleDeletePayment`, `pmtForm` state; a "Payments" block rendered in the drawer before the printable invoice.

- [ ] **Step 1: Add payment form state + handlers**

After the existing invoices state (near line 124-128) add:
```ts
const [paymentForm, setPaymentForm] = useState({ amount: '', paymentDate: '', method: 'other' as PaymentMethod, note: '' });
const [submittingPayment, setSubmittingPayment] = useState(false);
```

Add handlers after `handleUpdateInvoiceStatus` (line ~490):
```ts
const handleAddPayment = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!detailedInvoice) return;
  const amount = parseFloat(paymentForm.amount);
  if (!amount || isNaN(amount) || amount <= 0) {
    alert('Enter a valid payment amount greater than 0');
    return;
  }
  const { remaining } = paymentTotals(detailedInvoice);
  if (amount - remaining > 0.01) {
    alert(`Payment amount exceeds remaining balance of ₹${remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    return;
  }
  setSubmittingPayment(true);
  try {
    const headers = { Authorization: token ? `Bearer ${token}` : '' };
    const res = await axios.post(
      `${API_URL}/api/invoices/${detailedInvoice.id}/payments`,
      {
        amount,
        paymentDate: paymentForm.paymentDate || new Date().toISOString().split('T')[0],
        method: paymentForm.method,
        note: paymentForm.note || undefined
      },
      { headers }
    );
    const totals = res.data.data;
    setDetailedInvoice(prev => prev ? { ...prev, status: totals.invoiceStatus, payments: [...(prev.payments || []), res.data.data.payment] } : prev);
    setPaymentForm({ amount: '', paymentDate: '', method: 'other', note: '' });
    fetchAllData();
  } catch (err: any) {
    alert(err.response?.data?.message || 'Failed to record payment');
  } finally {
    setSubmittingPayment(false);
  }
};

const handleDeletePayment = async (paymentId: number) => {
  if (!detailedInvoice) return;
  if (!window.confirm('Delete this payment? The invoice status will be recalculated.')) return;
  try {
    const headers = { Authorization: token ? `Bearer ${token}` : '' };
    const res = await axios.delete(`${API_URL}/api/invoices/${detailedInvoice.id}/payments/${paymentId}`, { headers });
    const totals = res.data.data;
    setDetailedInvoice(prev => prev ? { ...prev, status: totals.invoiceStatus, payments: (prev.payments || []).filter(p => p.id !== paymentId) } : prev);
    fetchAllData();
  } catch (err: any) {
    alert(err.response?.data?.message || 'Failed to delete payment');
  }
};
```

- [ ] **Step 2: Render Payments section in drawer**

In the detail drawer, inside the scrollable content div (`<div className="p-8 md:p-12 ...">`, after the totals summary block which ends ~line 1766, and BEFORE the Payment Details & Greeting section at line 1768), add a `print:hidden` payments block:
```tsx
{/* --- Payments Register (not printed) --- */}
<div className="print:hidden border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-gray-50 dark:bg-gray-800/30">
  <div className="flex items-center justify-between mb-4">
    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
      <IndianRupee className="h-4 w-4 text-green-600" /> Payments
    </h4>
    <div className="flex items-center gap-4 text-xs font-semibold">
      <span className="text-green-600 dark:text-green-400">
        Paid: ₹{paymentTotals(detailedInvoice).paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </span>
      <span className="text-red-600 dark:text-red-400">
        Remaining: ₹{paymentTotals(detailedInvoice).remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </span>
    </div>
  </div>

  {(detailedInvoice.payments || []).length > 0 ? (
    <div className="space-y-2 mb-4">
      {(detailedInvoice.payments || []).slice().reverse().map(p => (
        <div key={p.id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-green-700 dark:text-green-400">₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className="text-gray-500 dark:text-gray-400">{formatDateSlash(p.paymentDate)}</span>
            <span className="capitalize bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded px-2 py-0.5">{p.method}</span>
            {p.note && <span className="text-gray-500 dark:text-gray-400 italic">{p.note}</span>}
          </div>
          {isAdminOrManager && (
            <button onClick={() => handleDeletePayment(p.id)} className="text-red-500 hover:text-red-700" title="Delete payment">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  ) : (
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">No payments recorded yet.</p>
  )}

  {detailedInvoice.status !== 'paid' && detailedInvoice.status !== 'cancelled' && isAdminOrManager && (
    <form onSubmit={handleAddPayment} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Amount (₹)</label>
        <input type="number" min="0.01" step="0.01" required value={paymentForm.amount}
          onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Date</label>
        <input type="date" value={paymentForm.paymentDate}
          onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Method</label>
        <select value={paymentForm.method}
          onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as PaymentMethod })}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">
          <option value="upi">UPI</option>
          <option value="bank">Bank Transfer</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Note</label>
        <input type="text" value={paymentForm.note}
          onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
      </div>
      <div className="col-span-2 md:col-span-1">
        <button type="submit" disabled={submittingPayment}
          className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" /> {submittingPayment ? 'Saving...' : 'Add Payment'}
        </button>
      </div>
    </form>
  )}
</div>
```

- [ ] **Step 3: Payments arrive with the invoice**

No extra fetch needed: `GET /api/invoices/:id` (Task 5) includes `payments`, and `handleOpenDetail` already stores the full invoice in `detailedInvoice`. The drawer renders `detailedInvoice.payments` directly. After add/delete, the handler locally updates `detailedInvoice.payments` and re-fetches the list — consistent.

- [ ] **Step 4: Build + verify**

Run: `npm run build` in `tailwind-frontend`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add tailwind-frontend/src/pages/Billing.tsx
git commit -m "feat: invoice payments register in detail drawer"
```

---

### Task 7: Payments tab content + remove Mark Paid

**Files:**
- Modify: `tailwind-frontend/src/pages/Billing.tsx`

**Interfaces:**
- Consumes: `invoices` (with `payments` from Task 5), `paymentTotals` (Task 4).
- Produces: `filteredPayments` list — a flat array of `{ invoice, payment }` across all invoices containing at least one payment; rendered under `activeTab === 'payments'`.

- [ ] **Step 1: Build filteredPayments**

After `filteredInvoices` add:
```ts
const filteredPayments = invoices
  .filter(inv => (inv.payments || []).length > 0)
  .flatMap(inv => (inv.payments || []).map(p => ({ invoice: inv, payment: p })))
  .sort((a, b) => new Date(b.payment.paymentDate).getTime() - new Date(a.payment.paymentDate).getTime());
```

- [ ] **Step 2: Render Payments tab**

After the invoices-tab block (the `{activeTab === 'invoices' && (...)}` block ends ~line 818) add:
```tsx
{activeTab === 'payments' && (
  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
    {filteredPayments.length === 0 ? (
      <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-750 rounded-xl bg-gray-50 dark:bg-gray-800/10 m-4">
        <IndianRupee className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No payments recorded yet</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Open an invoice and record its payment.</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left">
          <thead className="bg-gray-50 dark:bg-gray-800/40 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-405">
            <tr>
              <th className="px-6 py-4">Invoice #</th>
              <th className="px-6 py-4">Client / Project</th>
              <th className="px-6 py-4">Payment Date</th>
              <th className="px-6 py-4">Method</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4">Note</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
            {filteredPayments.map(({ invoice, payment }) => (
              <tr key={payment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">{invoice.invoiceNumber}</td>
                <td className="px-6 py-4">
                  {(invoice.client?.name || '—')}{invoice.project?.name ? ` / ${invoice.project.name}` : ''}
                </td>
                <td className="px-6 py-4">{formatDateSlash(payment.paymentDate)}</td>
                <td className="px-6 py-4">
                  <span className="capitalize bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded px-2 py-0.5">{payment.method}</span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-green-700 dark:text-green-400">
                  ₹{Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{payment.note || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 3: Remove Mark Paid button**

In the detail drawer toolbar (lines 1595-1602), delete the entire `Mark Paid` button block:
```tsx
{(detailedInvoice.status === 'draft' || detailedInvoice.status === 'sent') && (
  <button onClick={() => handleUpdateInvoiceStatus(detailedInvoice.id, 'paid')} ...>Mark Paid</button>
)}
```

- [ ] **Step 4: Disable 'paid' in invoice status dropdown**

In the invoice create/edit modal, find the status `<select>` (near line 967-1010, options `draft|sent|paid|overdue|cancelled`) and remove or disable the `<option value="paid">Paid</option>` when the user could choose it. Simplest: replace the paid option with a disabled version:
```tsx
<option value="paid" disabled>Paid (auto via payments)</option>
```
Edit mode prefills `status` — if an invoice is edited after being fully paid, `invoiceForm.status` will be `paid`; that option must still render (disabled is fine — it stays selected) or the select will show a blank value. Keep it disabled but present.

- [ ] **Step 5: Build + verify**

Run: `npm run build` in `tailwind-frontend`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add tailwind-frontend/src/pages/Billing.tsx
git commit -m "feat: payments tab and remove manual Mark Paid"
```

---

## Deployment / Ops Notes

After these tasks are merged and deployed to Vercel (backend) and the frontend host:
1. Backend must run `sync({ alter: true })` once so each tenant schema gets the `InvoicePayments` table. The existing `GET /api/db-sync` hook covers the primary schema only; tenant schemas are created on-demand by `tenantRouter` via `makeTenantSequelize` + `build()` (a schema sync happens during `syncAllTenants`; `tenantRouter` resolves and caches a Sequelize which models the new table). To force existing tenant schemas to get the table, run `node migrate-payments.js` (it builds each tenant's models) or hit each tenant once — a safe approach is to run `node -e "require('./services/tenantManager').syncAllTenants().then(r=>console.log(r.synced))"`.
2. Run `node migrate-payments.js` to backfill payment rows for existing `paid` invoices.