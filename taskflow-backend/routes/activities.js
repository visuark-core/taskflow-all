// routes/activities.js
const express = require('express');
const { protect } = require('../middlewares/auth');
const Activity = require('../models/Activity');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect);

// Get activities for a project
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const activities = await Activity.find({ project: req.params.projectId })
    .populate('user', 'name email avatar')
    .sort('-createdAt')
    .limit(50);

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities
  });
}));

// Get activities for user
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const activities = await Activity.find({ user: req.params.userId })
    .populate('user', 'name email avatar')
    .populate('project', 'name')
    .sort('-createdAt')
    .limit(50);

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities
  });
}));

// Get all activities (dashboard feed)
router.get('/', asyncHandler(async (req, res) => {
  // Get all projects user has access to
  const Project = require('../models/Project');
  const projects = await Project.find({
    $or: [
      { owner: req.user.id },
      { 'members.user': req.user.id }
    ]
  }).select('_id');

  const projectIds = projects.map(p => p._id);

  const activities = await Activity.find({ project: { $in: projectIds } })
    .populate('user', 'name email avatar')
    .populate('project', 'name')
    .populate('task', 'title')
    .sort('-createdAt')
    .limit(100);

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities
  });
}));

module.exports = router;

