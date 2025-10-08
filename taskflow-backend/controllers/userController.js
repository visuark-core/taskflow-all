const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Get all users
exports.getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find({ isActive: true })
    .select('name email avatar role department teams') // ← Included department
    .populate('teams', 'name')  
    .sort('name');

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// Get single user
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password') 
    .populate('teams', 'name description');

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// Update user by admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    department: req.body.department,
    isActive: req.body.isActive,
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => {
    if (fieldsToUpdate[key] === undefined) delete fieldsToUpdate[key];
  });

  const user = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// Soft delete user by admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Update current logged-in user's profile
exports.updateCurrentUser = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.fullName || req.body.name,
    email: req.body.email,
    role: req.body.role,
    department: req.body.department,
    bio: req.body.bio,
  };

  Object.keys(fieldsToUpdate).forEach(key => {
    if (fieldsToUpdate[key] === undefined) delete fieldsToUpdate[key];
  });

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});
