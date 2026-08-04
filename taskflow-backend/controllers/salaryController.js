const { User, SalaryDetail, SalaryPayout, Department } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all salary details (returns all users with their salary structure)
// @route   GET /api/salaries
// @access  Private
exports.getSalaryDetails = asyncHandler(async (req, res, next) => {
  // Fetch all users and include their salary structure and department
  const users = await User.findAll({
    where: { company: req.user.company },
    attributes: ['id', 'name', 'email', 'role', 'isActive'],
    include: [
      { 
        model: SalaryDetail, 
        as: 'salaryDetail',
        attributes: ['id', 'baseSalary', 'bankName', 'accountNumber', 'ifscCode', 'panNumber', 'upiId', 'paymentMethod']
      },
      {
        model: Department,
        as: 'managedDepartment',
        attributes: ['id', 'name']
      }
    ],
    order: [['name', 'ASC']]
  });

  const mappedUsers = users.map(u => {
    const userJson = u.toJSON();
    return {
      ...userJson,
      status: userJson.isActive ? 'active' : 'inactive'
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

  // Check if user exists
  const user = await User.findByPk(userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Upsert salary details
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
  const { month, status } = req.query;
  const whereClause = {};

  if (month) whereClause.month = month;
  if (status) whereClause.status = status;

  const payouts = await SalaryPayout.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'user',
        where: { company: req.user.company },
        required: true,
        attributes: ['id', 'name', 'email', 'role']
      }
    ],
    order: [['month', 'DESC'], ['payoutDate', 'DESC']]
  });

  res.status(200).json({
    success: true,
    count: payouts.length,
    data: payouts
  });
});

// @desc    Create a payout log
// @route   POST /api/salaries/payouts
// @access  Private
exports.createPayout = asyncHandler(async (req, res, next) => {
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

  // Check if user exists
  const user = await User.findByPk(userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Create payout
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

  const fullPayout = await SalaryPayout.findByPk(payout.id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }
    ]
  });

  res.status(201).json({
    success: true,
    data: fullPayout
  });
});

// @desc    Update a payout log
// @route   PUT /api/salaries/payouts/:id
// @access  Private
exports.updatePayout = asyncHandler(async (req, res, next) => {
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

  const fullPayout = await SalaryPayout.findByPk(payout.id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }
    ]
  });

  res.status(200).json({
    success: true,
    data: fullPayout
  });
});

// @desc    Delete a payout log
// @route   DELETE /api/salaries/payouts/:id
// @access  Private
exports.deletePayout = asyncHandler(async (req, res, next) => {
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
