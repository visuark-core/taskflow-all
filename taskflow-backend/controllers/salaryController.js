const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all salary details (all users with their salary structure)
// @route   GET /api/salaries
// @access  Private
exports.getSalaryDetails = asyncHandler(async (req, res, next) => {
  const { SalaryDetail, Department } = req.tenant.models;
  const salaries = await SalaryDetail.findAll({});
  const ids = salaries.map((s) => s.userId);

  const users = await req.tenant.getUsers(ids, ["id", "name", "email", "role", "isActive", "managedDepartmentId"]);
  const depts = await Department.findAll({ attributes: ["id", "name"] });
  const deptById = {};
  for (const d of depts) deptById[d.id] = d.toJSON();

  const mappedUsers = Object.values(users).map((u) => {
    const detail = salaries.find((s) => s.userId === u.id);
    return {
      ...u,
      status: u.isActive ? 'active' : 'inactive',
      salaryDetail: detail ? detail.toJSON() : null,
      managedDepartment: u.managedDepartmentId ? deptById[u.managedDepartmentId] || null : null
    };
  });

  res.status(200).json({
    success: true,
    count: mappedUsers.length,
    data: mappedUsers
  });
});

// @desc    Create or update salary details for a specific user
// @route   POST /api/salaries/detail
// @access  Private
exports.upsertSalaryDetail = asyncHandler(async (req, res, next) => {
  const { SalaryDetail } = req.tenant.models;
  const {
    userId,
    baseSalary,
    bankName,
    accountNumber,
    ifscCode,
    panNumber,
    upiId,
    paymentMethod
  } = req.body;

  if (!userId) {
    return next(new ErrorResponse('User ID is required', 400));
  }

  // Check if user exists (global Users table)
  const user = await User.findByPk(userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Upsert salary details in the tenant DB
  const [salaryDetail, created] = await SalaryDetail.findOrCreate({
    where: { userId },
    defaults: {
      baseSalary: parseFloat(baseSalary) || 0,
      bankName: bankName || null,
      accountNumber: accountNumber || null,
      ifscCode: ifscCode || null,
      panNumber: panNumber || null,
      upiId: upiId || null,
      paymentMethod: paymentMethod || 'Bank Transfer'
    }
  });

  if (!created) {
    // If it already existed, update it
    await salaryDetail.update({
      baseSalary: baseSalary !== undefined ? parseFloat(baseSalary) : salaryDetail.baseSalary,
      bankName: bankName !== undefined ? bankName : salaryDetail.bankName,
      accountNumber: accountNumber !== undefined ? accountNumber : salaryDetail.accountNumber,
      ifscCode: ifscCode !== undefined ? ifscCode : salaryDetail.ifscCode,
      panNumber: panNumber !== undefined ? panNumber : salaryDetail.panNumber,
      upiId: upiId !== undefined ? upiId : salaryDetail.upiId,
      paymentMethod: paymentMethod !== undefined ? paymentMethod : salaryDetail.paymentMethod
    });
  }

  res.status(200).json({
    success: true,
    data: salaryDetail
  });
});

// @desc    Get payout logs
// @route   GET /api/salaries/payouts
// @access  Private
exports.getPayouts = asyncHandler(async (req, res, next) => {
  const { SalaryPayout } = req.tenant.models;
  const { month, status } = req.query;
  const whereClause = {};

  if (month) whereClause.month = month;
  if (status) whereClause.status = status;

  const payouts = await SalaryPayout.findAll({
    where: whereClause,
    order: [['month', 'DESC'], ['payoutDate', 'DESC']]
  });

  const userMap = await req.tenant.getUsers(payouts.map((p) => p.userId), ["id", "name", "email", "role"]);
  const data = payouts.map((p) => ({ ...p.toJSON(), user: userMap[p.userId] || null }));

  res.status(200).json({
    success: true,
    count: data.length,
    data
  });
});

// @desc    Create a payout log
// @route   POST /api/salaries/payouts
// @access  Private
exports.createPayout = asyncHandler(async (req, res, next) => {
  const { SalaryPayout } = req.tenant.models;
  const {
    userId,
    month,
    amountPaid,
    payoutDate,
    status,
    transactionId,
    paymentMethod,
    notes
  } = req.body;

  if (!userId || !month || amountPaid === undefined) {
    return next(new ErrorResponse('User ID, month, and amount paid are required', 400));
  }

  // Check if user exists (global Users table)
  const user = await User.findByPk(userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Create payout in the tenant DB
  const payout = await SalaryPayout.create({
    userId,
    month,
    amountPaid: parseFloat(amountPaid) || 0,
    payoutDate: payoutDate || null,
    status: status || 'pending',
    transactionId: transactionId || null,
    paymentMethod: paymentMethod || null,
    notes: notes || null
  });

  const fullPayout = await SalaryPayout.findByPk(payout.id);
  const userMap = await req.tenant.getUsers([fullPayout.userId], ["id", "name", "email", "role"]);
  const data = { ...fullPayout.toJSON(), user: userMap[fullPayout.userId] || null };

  res.status(201).json({
    success: true,
    data
  });
});

// @desc    Update a payout log
// @route   PUT /api/salaries/payouts/:id
// @access  Private
exports.updatePayout = asyncHandler(async (req, res, next) => {
  const { SalaryPayout } = req.tenant.models;
  const {
    amountPaid,
    payoutDate,
    status,
    transactionId,
    paymentMethod,
    notes
  } = req.body;

  let payout = await SalaryPayout.findByPk(req.params.id);

  if (!payout) {
    return next(new ErrorResponse('Payout record not found', 404));
  }

  await payout.update({
    amountPaid: amountPaid !== undefined ? parseFloat(amountPaid) : payout.amountPaid,
    payoutDate: payoutDate !== undefined ? payoutDate : payout.payoutDate,
    status: status !== undefined ? status : payout.status,
    transactionId: transactionId !== undefined ? transactionId : payout.transactionId,
    paymentMethod: paymentMethod !== undefined ? paymentMethod : payout.paymentMethod,
    notes: notes !== undefined ? notes : payout.notes
  });

  const fullPayout = await SalaryPayout.findByPk(payout.id);
  const userMap = await req.tenant.getUsers([fullPayout.userId], ["id", "name", "email", "role"]);
  const data = { ...fullPayout.toJSON(), user: userMap[fullPayout.userId] || null };

  res.status(200).json({
    success: true,
    data
  });
});

// @desc    Delete a payout log
// @route   DELETE /api/salaries/payouts/:id
// @access  Private
exports.deletePayout = asyncHandler(async (req, res, next) => {
  const { SalaryPayout } = req.tenant.models;
  const payout = await SalaryPayout.findByPk(req.params.id);

  if (!payout) {
    return next(new ErrorResponse('Payout record not found', 404));
  }

  await payout.destroy();

  res.status(200).json({
    success: true,
    data: {}
  });
});