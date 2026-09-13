# Invoice Payments Design

**Date:** 2026-09-13
**Status:** Approved (design sections confirmed in chat)

## Problem

Invoices currently have only a `status` enum (`draft|sent|paid|overdue|cancelled`). There is no way to register full or partial payment (instalments) against an invoice. The "Mark Paid" button flips status directly with no payment record, so there is no payment history and no way to know how much has actually been received on a partially-paid invoice.

## Goals

- Register full or partial (instalment) payments against an invoice.
- Track amount paid vs amount remaining per invoice.
- Automatically flip invoice to `paid` once payments sum to `totalAmount`.
- Replace the manual "Mark Paid" button with the payment-driven flow.
- Keep revenue reporting correct: only fully-paid invoices count as revenue, which the auto-paid system guarantees naturally.

## Non-Goals

- No new `partial` status — partial invoices stay `sent`/`overdue` and show a remaining amount.
- No `paidAmount` column on Invoice; totals are derived from payment rows (single source of truth).
- No overpayment allowed.
- No changes to CEO revenue calculation (already correct once auto-paid is enforced).
- No receipt attachments or transaction/reference IDs.

## Design (Approach 1: dedicated `InvoicePayment` model)

### Section 1 — Data model

New model **`InvoicePayment`**:

| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | autoIncrement |
| `invoiceId` | INTEGER FK | `belongsTo Invoice`, `onDelete: CASCADE` |
| `amount` | FLOAT | `allowNull: false`, `validate: { min: 0.01 }` |
| `paymentDate` | DATE | default `NOW` |
| `method` | ENUM(`upi`,`bank`,`cash`,`cheque`,`other`) | default `other` |
| `note` | TEXT | optional |

- Registered in `models/index.js` via `build()` with association `Invoice.hasMany(InvoicePayment, { as: "payments", onDelete: "CASCADE" })`, `InvoicePayment.belongsTo(Invoice, { foreignKey: "invoiceId", as: "invoice" })`.
- Added to `tenantManager.BUSINESS` array so per-tenant `sync({ alter: true })` creates the table.
- No new column on `Invoice`. Sum of `payments` rows gives `paidAmount` and `remaining = totalAmount - paidAmount`.

### Section 2 — Backend API

All routes mount under `/api/invoices`, protected by existing `protect → tenantRouter → authorizeFinance` chain, model access via `req.tenant.models`.

- **`POST /api/invoices/:id/payments`** — body `{ amount, paymentDate, method, note }`.
  - Invoice must exist and be in a payable status (`draft`, `sent`, `overdue` — not `cancelled` or `paid`).
  - `amount > 0`.
  - Guard: `amount <= totalAmount - sum(existing payments)` (block overpay).
  - Transaction: create payment → recompute sum → if `sum >= totalAmount` (epsilon `0.01`, amounts are FLOAT), set `status = 'paid'`. If invoice was `overdue` and payment is partial, leave as `overdue`; if `draft`, leave `draft`.
  - Response: `{ success: true, data: { payment, paidAmount, remaining, invoiceStatus } }`.
- **`GET /api/invoices/:id/payments`** — list payments for invoice, `createdAt DESC`. Response `{ success: true, data: InvoicePayment[] }`.
- **`DELETE /api/invoices/:id/payments/:paymentId`** — delete payment; recompute sum; if full again set `paid`, if partial and due-date passed set `overdue`, else `sent`. Response `{ success: true, data: { paidAmount, remaining, invoiceStatus } }`.
- **`PUT /api/invoices/:id`** — `status` in body restricted: server ignores attempts to set `paid` directly (payment flow is the only path to `paid`). Manual status changes still allowed for `draft`, `sent`, `cancelled`, `overdue`.

### Section 3 — Frontend (Billing.tsx)

- **Paid / Remaining columns** in the invoices table: compute from `inv.payments` if present; otherwise fetch payments for the invoice list (`GET /api/invoices` includes `payments` association). Display `₹` with `en-IN` formatting.
- **Detail drawer "Payments" section**:
  - Payments list: date, method, amount, note, per-row delete action (confirm).
  - "Add Payment" form: amount, date, method select, note. Client-side guard: `amount > remaining` shows alert and blocks submit.
  - Shows running **Paid** / **Remaining** totals.
- **"Payments" tab** (new, alongside Invoices tab): all payments across invoices, table with invoice #, client/project, date, method, amount, note; search + filter by status/invoice.
- **Remove "Mark Paid" button** from detail drawer; disable `paid` option in the invoice status dropdown.
- Existing status color mapping and filters unchanged.

### Section 4 — Migration

One-off script `taskflow-backend/migrate-payments.js`:
- Iterate every tenant schema (same pattern as `migrate-tenants.js`, driven by `tenantManager.BUSINESS`).
- For each invoice with `status = 'paid'` and zero `InvoicePayment` rows: create a full `totalAmount` payment row (method `other`, paymentDate = invoice `updatedAt` as best-effort approximation of when it was marked paid).
- Run once per tenant schema after deploy.
- The new `InvoicePayments` table itself is created per tenant by `syncAllTenants()` (provisioning already calls `seq.sync({ alter: true })`; a `syncAllTenants()` run after deploy picks it up in every existing schema).

### Section 5 — Reports

No change. CEO revenue (`reports.js`) already filters `status = 'paid'`; auto-paid enforcement guarantees only fully-collected invoices contribute revenue.

## Testing

- Backend route tests (if test infra exists) for: full payment → `paid`; partial → remains; overpay rejected; delete partial → revert status; cancel invoice blocks payments.
- Manual frontend verification: create invoice, add partial then full payment, confirm Paid/Remaining columns update, confirm Payments tab lists entries, confirm Mark Paid gone.

## Files touched

- `taskflow-backend/models/InvoicePayment.js` (new)
- `taskflow-backend/models/index.js` (register model + associations)
- `taskflow-backend/services/tenantManager.js` (BUSINESS array)
- `taskflow-backend/controllers/invoiceController.js` (payment handlers + status guard)
- `taskflow-backend/routes/invoices.js` (payment routes)
- `taskflow-backend/migrate-payments.js` (new)
- `tailwind-frontend/src/pages/Billing.tsx` (Paid/Remaining columns, Payments tab, drawer section, remove Mark Paid)