const express = require('express');
const { protect } = require('../middlewares/auth');
const Team = require('../models/Team');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const router = express.Router();

router.use(protect);

// Get all teams for user
router.get('/', asyncHandler(async (req, res) => {
  const teams = await Team.find({
    $or: [
      { owner: req.user.id },
      { 'members.user': req.user.id }
    ]
  })
  .populate('owner', 'name email avatar')
  .populate('members.user', 'name email avatar')
  .populate('projects', 'name status')
  .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: teams.length,
    data: teams
  });
}));

// Get single team
router.get('/:id', asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .populate('projects', 'name status progress');

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  const hasAccess = team.owner.equals(req.user.id) || 
                   team.members.some(member => member.user.equals(req.user.id));

  if (!hasAccess) {
    return next(new ErrorResponse('Not authorized to access this team', 403));
  }

  res.status(200).json({
    success: true,
    data: team
  });
}));

// ✅ NEW ROUTE: Get only team members
router.get('/:id/members', asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id)
    .populate('members.user', 'name email avatar');

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  const isMember = team.owner.equals(req.user.id) || 
                   team.members.some(member => member.user.equals(req.user.id));

  if (!isMember) {
    return next(new ErrorResponse('Not authorized to view team members', 403));
  }

  res.status(200).json({
    success: true,
    members: team.members.map(m => ({
      _id: m.user._id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      role: m.role
    }))
  });
}));

// Create new team
router.post('/', asyncHandler(async (req, res) => {
  req.body.owner = req.user.id;
  
  const team = await Team.create(req.body);
  
  team.generateInviteCode();
  await team.save();

  team.members.push({
    user: req.user.id,
    role: 'admin'
  });
  await team.save();

  await User.findByIdAndUpdate(req.user.id, {
    $push: { teams: team._id }
  });

  res.status(201).json({
    success: true,
    data: team
  });
}));

// Update team
router.put('/:id', asyncHandler(async (req, res, next) => {
  let team = await Team.findById(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  const isAdmin = team.members.some(member => 
    member.user.equals(req.user.id) && (member.role === 'admin' || member.role === 'lead')
  );

  if (!team.owner.equals(req.user.id) && !isAdmin) {
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
}));

// Delete team
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  if (!team.owner.equals(req.user.id)) {
    return next(new ErrorResponse('Only team owner can delete the team', 403));
  }

  await team.remove();

  await User.updateMany(
    { teams: team._id },
    { $pull: { teams: team._id } }
  );

  res.status(200).json({
    success: true,
    data: {}
  });
}));

// Join team with invite code
router.post('/join', asyncHandler(async (req, res, next) => {
  const { inviteCode } = req.body;

  const team = await Team.findOne({ inviteCode });

  if (!team) {
    return next(new ErrorResponse('Invalid invite code', 400));
  }

  const isMember = team.members.some(member => member.user.equals(req.user.id));

  if (isMember) {
    return next(new ErrorResponse('You are already a member of this team', 400));
  }

  team.members.push({
    user: req.user.id,
    role: 'member'
  });
  await team.save();

  await User.findByIdAndUpdate(req.user.id, {
    $push: { teams: team._id }
  });

  res.status(200).json({
    success: true,
    data: team
  });
}));

// Leave team
router.post('/:id/leave', asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  if (team.owner.equals(req.user.id)) {
    return next(new ErrorResponse('Team owner cannot leave the team', 400));
  }

  team.members = team.members.filter(member => !member.user.equals(req.user.id));
  await team.save();

  await User.findByIdAndUpdate(req.user.id, {
    $pull: { teams: team._id }
  });

  res.status(200).json({
    success: true,
    data: {}
  });
}));

// Update member role
router.put('/:id/members/:userId', asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  const isAdmin = team.members.some(member => 
    member.user.equals(req.user.id) && (member.role === 'admin' || member.role === 'lead')
  );

  if (!team.owner.equals(req.user.id) && !isAdmin) {
    return next(new ErrorResponse('Not authorized to update member roles', 403));
  }

  const memberIndex = team.members.findIndex(member => 
    member.user.equals(req.params.userId)
  );

  if (memberIndex === -1) {
    return next(new ErrorResponse('Member not found in team', 404));
  }

  team.members[memberIndex].role = req.body.role;
  await team.save();

  res.status(200).json({
    success: true,
    data: team
  });
}));

module.exports = router;
