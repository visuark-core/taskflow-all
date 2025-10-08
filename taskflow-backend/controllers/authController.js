// controllers/authController.js
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Register user
exports.register = asyncHandler(async (req, res, next) => {
  console.log('Register request body:', req.body);
  const { name, email, password, company, role, department } = req.body;
  if (!company) {
    return next(new ErrorResponse('Company name is required', 400));
  }

  // Store all provided fields with user
  const user = await User.create({
    name,
    email,
    password,
    company,
    role,
    department
  });

  // Create company and associate owner
  // If you have a Company model, create it here
  // const Company = require('../models/Company');
  // const newCompany = await Company.create({
  //   name: company,
  //   owner: user._id
  // });

  sendTokenResponse(user, 201, res);
});

// Login user
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Check for user
  const userWithPassword = await User.findOne({ email }).select('+password');

  if (!userWithPassword) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if password matches
  const isMatch = await userWithPassword.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Update last login
  userWithPassword.lastLogin = Date.now();
  await userWithPassword.save();

  // Fetch user without password for response
  const user = await User.findById(userWithPassword._id);
  sendTokenResponse(user, 200, res);
});

// Get current logged in user
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('teams')
    .select('-password');

  res.status(200).json({
    success: true,
    data: user
  });
});

// Update user details
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    preferences: req.body.preferences
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// Update password
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// Logout user
exports.logout = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {}
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  const { _id, name, email, role, company, department, avatar } = user.toObject();

  res
    .status(statusCode)
    .json({
      success: true,
      token,
      user: {
        id: _id,
        name,
        email,
        role,
        company,
        department,
        avatar
      }
    });
};

