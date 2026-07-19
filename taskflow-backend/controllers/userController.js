const { User, Team, Department } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');

// Get all users
exports.getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.findAll({
    where: { isActive: true },
    attributes: ['id', 'name', 'email', 'avatar', 'role', 'department'],
    include: [{ model: Team, attributes: ['id', 'name'] }],
    order: [['name', 'ASC']]
  });

  res.status(200).json({
    success: true,
    count: users.length,
    users // Note: The frontend expects 'users', not 'data' based on the old route
  });
});

// Get team members (my-team-members)
exports.getTeamMembers = asyncHandler(async (req, res, next) => {
  // Simplified implementation
  res.status(200).json({ success: true, count: 0, members: [] });
});

// Upload Avatar
exports.uploadAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a file' });
  }

  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  user.avatar = `/uploads/${req.file.filename}`;
  await user.save();

  res.status(200).json({ success: true, user });
});

// Create user (admin)
exports.createUser = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Only admins can create users' });
  }

  const { name, email, password, role, department } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, email, and password are required', message: 'Name, email, and password are required' });
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ success: false, error: 'User with this email already exists', message: 'User with this email already exists' });
  }

  const payload = { name, email, password };
  if (role) payload.role = role;
  if (department) payload.department = department;
  if (req.user && req.user.company) payload.company = req.user.company;

  const newUser = await User.create(payload);

  if (department && (role === 'manager' || role === 'department_manager')) {
    const deptObj = await Department.findOne({ where: { name: department } });
    if (deptObj) {
      if (deptObj.managerId) {
        await User.update({ role: 'user', managedDepartmentId: null }, { where: { id: deptObj.managerId } });
      }
      await deptObj.update({ managerId: newUser.id });
      await newUser.update({ role: 'department_manager', managedDepartmentId: deptObj.id });
      await deptObj.addMember(newUser.id, { through: { role: 'lead' } });
    }
  }

  res.status(201).json({
    success: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: (department && (role === 'manager' || role === 'department_manager')) ? 'department_manager' : newUser.role,
      department: newUser.department,
    },
  });
});

// Get single user
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password'] },
    include: [{ model: Team, attributes: ['id', 'name', 'description'] }]
  });

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    user // Changed from data to user
  });
});

// Update user by admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Only admins can edit users' });
  }

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

  const user = await User.findByPk(req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (req.body.password && req.body.password.trim().length >= 6) {
    user.password = req.body.password;
  }

  await user.update(fieldsToUpdate);

  if (fieldsToUpdate.department && (fieldsToUpdate.role === 'manager' || fieldsToUpdate.role === 'department_manager')) {
    const deptObj = await Department.findOne({ where: { name: fieldsToUpdate.department } });
    if (deptObj) {
      if (deptObj.managerId && deptObj.managerId !== user.id) {
        await User.update({ role: 'user', managedDepartmentId: null }, { where: { id: deptObj.managerId } });
      }
      await deptObj.update({ managerId: user.id });
      await user.update({ role: 'department_manager', managedDepartmentId: deptObj.id });
      await deptObj.addMember(user.id, { through: { role: 'lead' } });
    }
  }

  res.status(200).json({
    success: true,
    user // Changed from data to user
  });
});

// Soft delete user by admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Only admins can delete users' });
  }

  const user = await User.findByPk(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  await user.update({ isActive: false });

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
    company: req.body.company,
    bio: req.body.bio,
  };

  Object.keys(fieldsToUpdate).forEach(key => {
    if (fieldsToUpdate[key] === undefined) delete fieldsToUpdate[key];
  });

  const user = await User.findByPk(req.user.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  await user.update(fieldsToUpdate);

  res.status(200).json({
    success: true,
    user // Changed from data to user
  });
});
