const { Invoice, InvoiceItem, Project, Client, sequelize } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = asyncHandler(async (req, res, next) => {
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
      { model: InvoiceItem, as: 'items' }
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
  const invoice = await Invoice.findByPk(req.params.id, {
    include: [
      { model: Project, as: 'project', attributes: ['id', 'name', 'description', 'startDate', 'endDate'] },
      { model: Client, as: 'client', attributes: ['id', 'name', 'company', 'email', 'phone', 'address', 'website'] },
      { model: InvoiceItem, as: 'items' }
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
  const authorizedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'];
  if (!authorizedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to create invoices', 403));
  }

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
      amount
    };
  });

  const tax = subtotal * ((parseFloat(taxRate) || 0) / 100);
  const discountAmt = parseFloat(discount) || 0;
  const totalAmount = Math.max(0, subtotal + tax - discountAmt);

  const t = await sequelize.transaction();

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
        { model: InvoiceItem, as: 'items' }
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
  const authorizedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'];
  if (!authorizedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to update invoices', 403));
  }

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
        invoiceId: invoice.id
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

  const t = await sequelize.transaction();

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
        { model: InvoiceItem, as: 'items' }
      ]
    });

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
  const authorizedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'];
  if (!authorizedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to delete invoices', 403));
  }

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
