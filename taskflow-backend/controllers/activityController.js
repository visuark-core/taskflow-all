// controllers/activityController.js
const Activity = require('../models/Activity');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Get all activities for user's projects
exports.getActivities = asyncHandler(async (req, res, next) => {
  // Get user's projects
  const projects = await Project.find({
    $or: [
      { owner: req.user.id },
      { 'members.user': req.user.id }
    ]
  }).select('_id');

  const projectIds = projects.map(p => p._id);

  const activities = await Activity.find({ 
    project: { $in: projectIds } 
  })
  .populate('user', 'name email avatar')
  .populate('project', 'name')
  .populate('task', 'title')
  .sort('-createdAt')
  .limit(parseInt(req.query.limit) || 100);

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities
  });
});

// Get activities for a specific project
exports.getProjectActivities = asyncHandler(async (req, res, next) => {
  const activities = await Activity.find({ 
    project: req.params.projectId 
  })
  .populate('user', 'name email avatar')
  .populate('task', 'title')
  .sort('-createdAt')
  .limit(parseInt(req.query.limit) || 50);

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities
  });
});

// Get activities for a specific user
exports.getUserActivities = asyncHandler(async (req, res, next) => {
  const activities = await Activity.find({ 
    user: req.params.userId 
  })
  .populate('user', 'name email avatar')
  .populate('project', 'name')
  .populate('task', 'title')
  .sort('-createdAt')
  .limit(parseInt(req.query.limit) || 50);

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities
  });
});

