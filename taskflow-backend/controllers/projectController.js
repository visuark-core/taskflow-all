// controllers/projectController.js
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Get all projects for user
exports.getProjects = asyncHandler(async (req, res, next) => {
  const projects = await Project.find({
    $or: [
      { owner: req.user.id },
      { 'members.user': req.user.id }
    ]
  })
  .populate('owner', 'name email avatar')
  .populate('members.user', 'name email avatar')
  .populate('team', 'name')
  .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: projects.length,
    data: projects
  });
});

// Get single project
exports.getProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .populate('team', 'name');

  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }

  // Check if user has access to project
  const hasAccess = project.owner.equals(req.user.id) || 
                   project.members.some(member => member.user.equals(req.user.id));

  if (!hasAccess) {
    return next(new ErrorResponse('Not authorized to access this project', 403));
  }

  res.status(200).json({
    success: true,
    data: project
  });
});

// Create new project
exports.createProject = asyncHandler(async (req, res, next) => {
  req.body.owner = req.user.id;

  const project = await Project.create(req.body);

  // Create activity
  await Activity.create({
    type: 'project_created',
    description: `${req.user.name} created project ${project.name}`,
    user: req.user.id,
    project: project._id
  });

  // Emit socket event
  req.io.emit('project-created', {
    project,
    user: req.user
  });

  res.status(201).json({
    success: true,
    data: project
  });
});

// Update project
exports.updateProject = asyncHandler(async (req, res, next) => {
  let project = await Project.findById(req.params.id);

  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }

  // Check if user is owner or admin
  const isAdmin = project.members.some(member => 
    member.user.equals(req.user.id) && member.role === 'admin'
  );

  if (!project.owner.equals(req.user.id) && !isAdmin) {
    return next(new ErrorResponse('Not authorized to update this project', 403));
  }

  project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Create activity
  await Activity.create({
    type: 'project_updated',
    description: `${req.user.name} updated project ${project.name}`,
    user: req.user.id,
    project: project._id,
    metadata: { changes: req.body }
  });

  // Emit socket event
  req.io.to(`project-${project._id}`).emit('project-updated', {
    project,
    user: req.user
  });

  res.status(200).json({
    success: true,
    data: project
  });
});

// Delete project
exports.deleteProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }

  // Check if user is owner
  if (!project.owner.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to delete this project', 403));
  }

  await project.deleteOne();

  // Emit socket event
  req.io.emit('project-deleted', {
    projectId: project._id,
    user: req.user
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Add member to project
exports.addMember = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }

  // Check if user is owner or admin
  const isAdmin = project.members.some(member => 
    member.user.equals(req.user.id) && member.role === 'admin'
  );

  if (!project.owner.equals(req.user.id) && !isAdmin) {
    return next(new ErrorResponse('Not authorized to add members to this project', 403));
  }

  // Check if member already exists
  const memberExists = project.members.some(member => 
    member.user.equals(req.body.userId)
  );

  if (memberExists) {
    return next(new ErrorResponse('User is already a member of this project', 400));
  }

  project.members.push({
    user: req.body.userId,
    role: req.body.role || 'member'
  });

  await project.save();

  // Create activity
  await Activity.create({
    type: 'member_joined',
    description: `${req.user.name} added a new member to project ${project.name}`,
    user: req.user.id,
    project: project._id,
    metadata: { newMemberId: req.body.userId }
  });

  res.status(200).json({
    success: true,
    data: project
  });
});

// Remove member from project
exports.removeMember = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }

  // Check if user is owner or admin
  const isAdmin = project.members.some(member => 
    member.user.equals(req.user.id) && member.role === 'admin'
  );

  if (!project.owner.equals(req.user.id) && !isAdmin) {
    return next(new ErrorResponse('Not authorized to remove members from this project', 403));
  }

  project.members = project.members.filter(member => 
    !member.user.equals(req.params.userId)
  );

  await project.save();

  // Create activity
  await Activity.create({
    type: 'member_left',
    description: `${req.user.name} removed a member from project ${project.name}`,
    user: req.user.id,
    project: project._id,
    metadata: { removedMemberId: req.params.userId }
  });

  res.status(200).json({
    success: true,
    data: project
  });
});

