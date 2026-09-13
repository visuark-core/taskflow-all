const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = asyncHandler(async (req, res, next) => {
  const { Invoice, InvoiceItem, Project, Client, InvoicePayment } = req.tenant.models;
  const { projectId, clientId, status } = req.query;
  const whereClause = {};

  if (projectId) whereClause.projectId = projectId;
  if (clientId) whereClause.clientId = clientId;
  if (status) whereClause.status = status;

  const invoices = await Invoice.findAll({
    where: whereClause,
    include: [
      { model: Project, as: 'project', attributes: ['id', 'name'] },
      { model: Client, as: 'client', attributes: ['id', 'name', 'company'] },
      { model: InvoiceItem, as: 'items' },
      { model: InvoicePayment, as: 'payments' }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({
    success: true,
    count: invoices.length,
    data: invoices
  });
});

// @desc    Get a single invoice
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoice = asyncHandler(async (req, res, next) => {
  const { Invoice, InvoiceItem, Project, Client, InvoicePayment } = req.tenant.models;
  const invoice = await Invoice.findByPk(req.params.id, {
    include: [
      { model: Project, as: 'project', attributes: ['id', 'name', 'description', 'startDate', 'endDate'] },
      { model: Client, as: 'client', attributes: ['id', 'name', 'company', 'email', 'phone', 'address', 'website'] },
      { model: InvoiceItem, as: 'items' },
      { model: InvoicePayment, as: 'payments' }
    ]
  });

  if (!invoice) {
    return next(new ErrorResponse('Invoice not found', 404));
  }

  res.status(200).json({
    success: true,
    data: invoice
  });
});

// @desc    Create an invoice
// @route   POST /api/invoices
// @access  Private (Admin/Manager/Executive)
exports.createInvoice = asyncHandler(async (req, res, next) => {
  const { Invoice, InvoiceItem, Project, Client, InvoicePayment } = req.tenant.models;
  const {
    invoiceNumber,
    issueDate,
    dueDate,
    projectId,
    clientId,
    taxRate,
    discount,
    notes,
    items
  } = req.body;

  if (!invoiceNumber || !dueDate || !projectId || !clientId) {
    return next(new ErrorResponse('Invoice number, due date, project, and client are required', 400));
  }

  if (!items || items.length === 0) {
    return next(new ErrorResponse('Invoice must have at least one service line item', 400));
  }

  // Check if invoice number is unique
  const exists = await Invoice.findOne({ where: { invoiceNumber } });
  if (exists) {
    return next(new ErrorResponse('Invoice number already exists', 400));
  }

  // Calculate totals
  let subtotal = 0;
  const processedItems = items.map(item => {
    const rate = parseFloat(item.rate) || 0;
    const quantity = parseFloat(item.quantity) || 1;
    const amount = rate * quantity;
    subtotal += amount;

    return {
      serviceName: item.serviceName,
      rate,
      quantity,
      amount,
      description: item.description
    };
  });

  const tax = subtotal * ((parseFloat(taxRate) || 0) / 100);
  const discountAmt = parseFloat(discount) || 0;
  const totalAmount = Math.max(0, subtotal + tax - discountAmt);

  const t = await req.tenant.sequelize.transaction();

  try {
    const invoice = await Invoice.create({
      invoiceNumber,
      issueDate: issueDate || new Date(),
      dueDate,
      taxRate: parseFloat(taxRate) || 0,
      discount: discountAmt,
      totalAmount,
      notes,
      projectId,
      clientId,
      status: 'draft'
    }, { transaction: t });

    // Create line items
    const itemsWithInvoiceId = processedItems.map(item => ({
      ...item,
      invoiceId: invoice.id
    }));

    await InvoiceItem.bulkCreate(itemsWithInvoiceId, { transaction: t });

    await t.commit();

    const fullInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Client, as: 'client', attributes: ['id', 'name', 'company'] },
        { model: InvoiceItem, as: 'items' },
        { model: InvoicePayment, as: 'payments' }
      ]
    });

    res.status(201).json({
      success: true,
      data: fullInvoice
    });

  } catch (error) {
    await t.rollback();
    return next(new ErrorResponse(error.message || 'Failed to create invoice', 500));
  }
});

// @desc    Update an invoice
// @route   PUT /api/invoices/:id
// @access  Private (Admin/Manager/Executive)
exports.updateInvoice = asyncHandler(async (req, res, next) => {
  const { Invoice, InvoiceItem, Project, Client, InvoicePayment } = req.tenant.models;
  let invoice = await Invoice.findByPk(req.params.id);

  if (!invoice) {
    return next(new ErrorResponse('Invoice not found', 404));
  }

  const {
    invoiceNumber,
    issueDate,
    dueDate,
    projectId,
    clientId,
    taxRate,
    discount,
    status,
    notes,
    items
  } = req.body;

  if (status === 'paid' && invoice.status !== 'paid') {
    return next(new ErrorResponse('Set status to paid by recording payments against the invoice', 400));
  }

  // Calculate totals if items are provided
  let totalAmount = invoice.totalAmount;
  let processedItems = null;

  if (items && items.length > 0) {
    let subtotal = 0;
    processedItems = items.map(item => {
      const rate = parseFloat(item.rate) || 0;
      const quantity = parseFloat(item.quantity) || 1;
      const amount = rate * quantity;
      subtotal += amount;

      return {
        serviceName: item.serviceName,
        rate,
        quantity,
        amount,
        invoiceId: invoice.id,
        description: item.description
      };
    });

    const currentTaxRate = taxRate !== undefined ? taxRate : invoice.taxRate;
    const currentDiscount = discount !== undefined ? discount : invoice.discount;

    const tax = subtotal * ((parseFloat(currentTaxRate) || 0) / 100);
    const discountAmt = parseFloat(currentDiscount) || 0;
    totalAmount = Math.max(0, subtotal + tax - discountAmt);
  } else if (taxRate !== undefined || discount !== undefined) {
    // If tax or discount changed but not items, fetch existing items to recalculate
    const existingItems = await InvoiceItem.findAll({ where: { invoiceId: invoice.id } });
    let subtotal = existingItems.reduce((acc, curr) => acc + curr.amount, 0);

    const currentTaxRate = taxRate !== undefined ? taxRate : invoice.taxRate;
    const currentDiscount = discount !== undefined ? discount : invoice.discount;

    const tax = subtotal * ((parseFloat(currentTaxRate) || 0) / 100);
    const discountAmt = parseFloat(currentDiscount) || 0;
    totalAmount = Math.max(0, subtotal + tax - discountAmt);
  }

  const t = await req.tenant.sequelize.transaction();

  try {
    await invoice.update({
      invoiceNumber: invoiceNumber || invoice.invoiceNumber,
      issueDate: issueDate || invoice.issueDate,
      dueDate: dueDate || invoice.dueDate,
      projectId: projectId || invoice.projectId,
      clientId: clientId || invoice.clientId,
      taxRate: taxRate !== undefined ? parseFloat(taxRate) : invoice.taxRate,
      discount: discount !== undefined ? parseFloat(discount) : invoice.discount,
      status: status || invoice.status,
      notes: notes !== undefined ? notes : invoice.notes,
      totalAmount
    }, { transaction: t });

    if (processedItems) {
      // Recreate line items: delete old ones first, then create new ones
      await InvoiceItem.destroy({ where: { invoiceId: invoice.id }, transaction: t });
      await InvoiceItem.bulkCreate(processedItems, { transaction: t });
    }

    await t.commit();

    const updatedInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Client, as: 'client', attributes: ['id', 'name', 'company'] },
        { model: InvoiceItem, as: 'items' },
        { model: InvoicePayment, as: 'payments' }
      ]
    });

    if (updatedInvoice.payments && updatedInvoice.payments.length > 0) {
      await settleInvoiceStatus(updatedInvoice, updatedInvoice.payments);
    }

    res.status(200).json({
      success: true,
      data: updatedInvoice
    });

  } catch (error) {
    await t.rollback();
    return next(new ErrorResponse(error.message || 'Failed to update invoice', 500));
  }
});

// @desc    Delete an invoice
// @route   DELETE /api/invoices/:id
// @access  Private (Admin/Manager/Executive)
exports.deleteInvoice = asyncHandler(async (req, res, next) => {
  const { Invoice } = req.tenant.models;
  const invoice = await Invoice.findByPk(req.params.id);

  if (!invoice) {
    return next(new ErrorResponse('Invoice not found', 404));
  }

  // Deleting the invoice will cascade delete all InvoiceItems automatically
  await invoice.destroy();

  res.status(200).json({
    success: true,
    data: {}
  });
});

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

  const t = await req.tenant.sequelize.transaction();
  try {
    const locked = await Invoice.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!locked) {
      await t.rollback();
      return next(new ErrorResponse('Invoice not found', 404));
    }
    if (locked.status === 'cancelled') {
      await t.rollback();
      return next(new ErrorResponse('Cannot record payment on a cancelled invoice', 400));
    }
    if (locked.status === 'paid') {
      await t.rollback();
      return next(new ErrorResponse('Invoice is already fully paid', 400));
    }
    const existing = await InvoicePayment.findAll({ where: { invoiceId: locked.id }, transaction: t });
    const { remaining } = paymentTotals(locked, existing);
    if (amount - remaining > PAYMENT_EPSILON) {
      await t.rollback();
      return next(new ErrorResponse(`Payment amount exceeds remaining balance of ₹${remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400));
    }
    const payment = await InvoicePayment.create({
      invoiceId: locked.id,
      amount,
      paymentDate: req.body.paymentDate || new Date(),
      method: req.body.method || 'other',
      note: req.body.note
    }, { transaction: t });

    const payments = await InvoicePayment.findAll({ where: { invoiceId: locked.id }, transaction: t });
    const totals = await settleInvoiceStatus(locked, payments, t);
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