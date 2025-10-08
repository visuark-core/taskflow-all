// controllers/teamController.js
const Team = require('../models/Team');
const User = require('../models/User');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Get all teams
exports.getTeams = asyncHandler(async (req, res, next) => {
  const teams = await Team.find({
    $or: [
      { owner: req.user.id },
      { 'members.user': req.user.id }
    ]
  })
  .populate('owner', 'name email avatar')
  .populate('members.user', 'name email avatar')
  .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: teams.length,
    data: teams
  });
});

// Get single team
exports.getTeam = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .populate('projects', 'name status progress');

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  // Check if user has access
  const hasAccess = team.owner.equals(req.user.id) || 
                   team.members.some(member => member.user.equals(req.user.id));

  if (!hasAccess) {
    return next(new ErrorResponse('Not authorized to access this team', 403));
  }

  res.status(200).json({
    success: true,
    data: team
  });
});

// Create team
exports.createTeam = asyncHandler(async (req, res, next) => {
  req.body.owner = req.user.id;

  const team = await Team.create(req.body);
  
  // Generate invite code
  team.generateInviteCode();
  
  // Add owner as admin
  team.members.push({
    user: req.user.id,
    role: 'admin'
  });
  
  await team.save();

  // Add team to user
  await User.findByIdAndUpdate(req.user.id, {
    $push: { teams: team._id }
  });

  res.status(201).json({
    success: true,
    data: team
  });
});

// Update team
exports.updateTeam = asyncHandler(async (req, res, next) => {
  let team = await Team.findById(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  // Check authorization
  const isAuthorized = team.owner.equals(req.user.id) || 
                      team.members.some(m => m.user.equals(req.user.id) && m.role === 'admin');

  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to update this team', 403));
  }

  team = await Team.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: team
  });
});

// Delete team
exports.deleteTeam = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  // Only owner can delete
  if (!team.owner.equals(req.user.id)) {
    return next(new ErrorResponse('Only team owner can delete the team', 403));
  }

  await team.remove();

  // Remove team from all users
  await User.updateMany(
    { teams: team._id },
    { $pull: { teams: team._id } }
  );

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Join team
exports.joinTeam = asyncHandler(async (req, res, next) => {
  const { inviteCode } = req.body;

  const team = await Team.findOne({ inviteCode });

  if (!team) {
    return next(new ErrorResponse('Invalid invite code', 400));
  }

  // Check if already a member
  const isMember = team.members.some(member => member.user.equals(req.user.id));

  if (isMember) {
    return next(new ErrorResponse('Already a member of this team', 400));
  }

  // Add user to team
  team.members.push({
    user: req.user.id,
    role: 'member'
  });
  await team.save();

  // Add team to user
  await User.findByIdAndUpdate(req.user.id, {
    $push: { teams: team._id }
  });

  // Create activity
  await Activity.create({
    type: 'member_joined',
    description: `${req.user.name} joined the team`,
    user: req.user.id,
    metadata: { teamId: team._id }
  });

  res.status(200).json({
    success: true,
    data: team
  });
});

// Leave team
exports.leaveTeam = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  // Owner cannot leave
  if (team.owner.equals(req.user.id)) {
    return next(new ErrorResponse('Team owner cannot leave the team', 400));
  }

  // Remove from team
  team.members = team.members.filter(member => !member.user.equals(req.user.id));
  await team.save();

  // Remove team from user
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { teams: team._id }
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Add member
exports.addMember = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  // Check authorization
  const isAuthorized = team.owner.equals(req.user.id) || 
                      team.members.some(m => m.user.equals(req.user.id) && 
                      (m.role === 'admin' || m.role === 'lead'));

  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to add members', 403));
  }

  // Check if already a member
  const isMember = team.members.some(member => member.user.equals(req.body.userId));

  if (isMember) {
    return next(new ErrorResponse('User is already a member', 400));
  }

  // Add member
  team.members.push({
    user: req.body.userId,
    role: req.body.role || 'member'
  });
  await team.save();

  // Add team to user
  await User.findByIdAndUpdate(req.body.userId, {
    $push: { teams: team._id }
  });

  res.status(200).json({
    success: true,
    data: team
  });
});

// Remove member
exports.removeMember = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  // Check authorization
  const isAuthorized = team.owner.equals(req.user.id) || 
                      team.members.some(m => m.user.equals(req.user.id) && m.role === 'admin');

  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to remove members', 403));
  }

  // Remove member
  team.members = team.members.filter(member => !member.user.equals(req.params.userId));
  await team.save();

  // Remove team from user
  await User.findByIdAndUpdate(req.params.userId, {
    $pull: { teams: team._id }
  });

  res.status(200).json({
    success: true,
    data: team
  });
});

// Update member role
exports.updateMemberRole = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  // Check authorization
  const isAuthorized = team.owner.equals(req.user.id) || 
                      team.members.some(m => m.user.equals(req.user.id) && m.role === 'admin');

  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to update member roles', 403));
  }

  // Find and update member
  const memberIndex = team.members.findIndex(m => m.user.equals(req.params.userId));

  if (memberIndex === -1) {
    return next(new ErrorResponse('Member not found', 404));
  }

  team.members[memberIndex].role = req.body.role;
  await team.save();

  res.status(200).json({
    success: true,
    data: team
  });
});

