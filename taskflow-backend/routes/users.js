const express = require('express');
const { protect } = require('../middlewares/auth');
const User = require('../models/User');
const upload = require('../config/upload');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Apply authentication middleware globally
router.use(protect);

// @route   GET /api/users
// @desc    Get all active users
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  // Only return users from the same company as the authenticated user
  const users = await User.find({
    isActive: true,
    company: req.user.company
  })
    .select('name email avatar role department company')
    .sort('name');

  res.status(200).json({
    success: true,
    count: users.length,
    users,
  });
}));

// @route   GET /api/users/:id
// @desc    Get single user by ID
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('teams', 'name description');

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    user,
  });
}));

// @route   POST /api/users/avatar
// @desc    Upload avatar for current user
// @access  Private
router.post('/avatar', upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Please upload a file',
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { avatar: `/uploads/${req.file.filename}` },
    { new: true }
  );

  res.status(200).json({
    success: true,
    user,
  });
}));

// @route   PUT /api/users/me
// @desc    Update current user profile
// @access  Private
router.put('/me', asyncHandler(async (req, res) => {
  // Only allow admins to update email, role, department
  const isAdmin = req.user.role === 'admin';
  const updates = {
    name: req.body.fullName || req.body.name,
    bio: req.body.bio,
  };

  if (isAdmin) {
    if (req.body.email) updates.email = req.body.email;
    if (req.body.role) updates.role = req.body.role;
    if (req.body.department) updates.department = req.body.department;
  }

  // Remove undefined fields
  Object.keys(updates).forEach(key => {
    if (updates[key] === undefined) delete updates[key];
  });

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    user,
  });
}));

// @route   GET /api/users/my-team-members
// @desc    Get members who are in the same teams as the logged-in user
// @access  Private
router.get('/my-team-members', asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user.id).populate('teams');

  if (!currentUser || !currentUser.teams || currentUser.teams.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No teams found for this user',
    });
  }

  const teamIds = currentUser.teams.map(team => team._id);

  const teamMembers = await User.find({
    teams: { $in: teamIds },
    isActive: true,
    _id: { $ne: req.user.id },
  }).select('name email avatar role department');

  res.status(200).json({
    success: true,
    count: teamMembers.length,
    members: teamMembers,
  });
}));


// @route   POST /api/users
// @desc    Create a new user
// @access  Private (you can make it public if needed for registration)
router.post('/', asyncHandler(async (req, res) => {
  const { name, email, password, role, department } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and password are required',
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'User with this email already exists',
    });
  }

  // Get company from authenticated user
  const company = req.user.company || null;

  // Create new user and associate with company
  const newUser = await User.create({
    name,
    email,
    password,
    role,
    department,
    company,
  });

  res.status(201).json({
    success: true,
    user: {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      company: newUser.company,
    },
  });
}));


module.exports = router;