const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const ATTRS = ['id', 'name', 'email', 'avatar'];

// Get all teams
exports.getTeams = asyncHandler(async (req, res, next) => {
  const { Team, Department, Project, TeamMember } = req.tenant.models;
  const teams = await Team.findAll({
    include: [
      { model: Department },
      { model: Project, attributes: ['id', 'name', 'status', 'progress', 'priority', 'endDate'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  const tmRows = await TeamMember.findAll({});
  const userIds = [
    ...teams.map(t => t.ownerId),
    ...tmRows.map(m => m.UserId),
    ...teams.map(t => t.Department && t.Department.managerId)
  ];
  const userMap = await req.tenant.getUsers(userIds, ATTRS);
  teams.forEach(team => {
    team.setDataValue('owner', userMap[team.ownerId] || null);
    const mids = tmRows.filter(m => m.TeamId === team.id).map(m => m.UserId);
    team.setDataValue('members', mids.map(id => userMap[id]).filter(Boolean));
    if (team.Department) {
      team.Department.setDataValue('departmentManager', userMap[team.Department.managerId] || null);
    }
  });

  // Filter for teams user owns or is a member of
  const userTeams = teams.filter(team =>
    team.ownerId === req.user.id || team.members.some(m => m.id === req.user.id)
  );

  res.status(200).json({
    success: true,
    count: userTeams.length,
    data: userTeams
  });
});

// Get teams in a specific department
exports.getTeamsByDepartment = asyncHandler(async (req, res, next) => {
  const { Team, Project, Department, TeamMember } = req.tenant.models;
  const { departmentId } = req.params;

  const department = await Department.findByPk(departmentId);
  if (!department) {
    return next(new ErrorResponse('Department not found', 404));
  }

  const isAdminOrExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo'].includes(req.user.role);
  const isManager = department.managerId === req.user.id;

  if (!isAdminOrExecutive && !isManager) {
    return next(new ErrorResponse('Not authorized to view department teams', 403));
  }

  const teams = await Team.findAll({
    where: { departmentId },
    include: [
      { model: Project, attributes: ['id', 'name', 'status', 'progress', 'priority', 'endDate'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  const tmRows = await TeamMember.findAll({ where: { TeamId: teams.map(t => t.id) } });
  const userIds = [...teams.map(t => t.ownerId), ...tmRows.map(m => m.UserId)];
  const userMap = await req.tenant.getUsers(userIds, ATTRS);
  teams.forEach(team => {
    team.setDataValue('owner', userMap[team.ownerId] || null);
    const mids = tmRows.filter(m => m.TeamId === team.id).map(m => m.UserId);
    team.setDataValue('members', mids.map(id => userMap[id]).filter(Boolean));
  });

  res.status(200).json({
    success: true,
    count: teams.length,
    data: teams
  });
});

// Get single team
exports.getTeam = asyncHandler(async (req, res, next) => {
  const { Team, Department, Project, TeamMember } = req.tenant.models;
  const team = await Team.findByPk(req.params.id, {
    include: [
      { model: Department },
      { model: Project, attributes: ['id', 'name', 'status', 'progress'] }
    ]
  });

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  const tmRows = await TeamMember.findAll({ where: { TeamId: team.id } });
  const userMap = await req.tenant.getUsers(
    [team.ownerId, ...tmRows.map(m => m.UserId), team.Department && team.Department.managerId],
    ATTRS
  );
  team.setDataValue('owner', userMap[team.ownerId] || null);
  team.setDataValue('members', tmRows.map(m => userMap[m.UserId]).filter(Boolean));
  if (team.Department) {
    team.Department.setDataValue('departmentManager', userMap[team.Department.managerId] || null);
  }

  const isAdminOrExecutive = ['admin', 'ceo', 'cfo', 'cto'].includes(req.user.role);
  const hasAccess = team.ownerId === req.user.id ||
                   team.members.some(member => member.id === req.user.id) ||
                   isAdminOrExecutive;

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
  const { Team, Department, Activity } = req.tenant.models;
  const { departmentId, name, description, settings } = req.body;

  if (departmentId) {
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return next(new ErrorResponse('Department not found', 404));
    }

    const isAdminOrExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo'].includes(req.user.role);
    const isManager = department.managerId === req.user.id;

    if (!isAdminOrExecutive && !isManager) {
      return next(new ErrorResponse('Not authorized to create teams in this department', 403));
    }
  }

  const team = await Team.create({
    name,
    description,
    settings,
    departmentId,
    ownerId: req.user.id
  });

  team.generateInviteCode();
  await team.save();

  await team.addMember(req.user.id, { through: { role: 'admin' } });

  await Activity.create({
    type: 'team_created',
    description: `Team "${team.name}" created`,
    userId: req.user.id,
    metadata: { teamId: team.id, departmentId }
  });

  const fullTeam = await Team.findByPk(team.id, { include: [Department] });

  res.status(201).json({
    success: true,
    data: fullTeam
  });
});

// Update team
exports.updateTeam = asyncHandler(async (req, res, next) => {
  const { Team, Department, TeamMember } = req.tenant.models;
  const team = await Team.findByPk(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  const myMembership = await TeamMember.findOne({ where: { TeamId: team.id, UserId: req.user.id } });
  const isAdminOrOwner = team.ownerId === req.user.id ||
    (myMembership && myMembership.role === 'admin');

  if (!isAdminOrOwner) {
    return next(new ErrorResponse('Not authorized to update this team', 403));
  }

  if (req.body.departmentId && req.body.departmentId !== team.departmentId) {
    return next(new ErrorResponse('Cannot change team department', 400));
  }

  await team.update(req.body);

  const updatedTeam = await Team.findByPk(team.id, { include: [Department] });

  res.status(200).json({
    success: true,
    data: updatedTeam
  });
});

// Delete team
exports.deleteTeam = asyncHandler(async (req, res, next) => {
  const { Team } = req.tenant.models;
  const team = await Team.findByPk(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  if (team.ownerId !== req.user.id) {
    return next(new ErrorResponse('Only team owner can delete the team', 403));
  }

  await team.destroy();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Join team
exports.joinTeam = asyncHandler(async (req, res, next) => {
  const { Team, Activity, TeamMember } = req.tenant.models;
  const { inviteCode } = req.body;
  const team = await Team.findOne({ where: { inviteCode } });

  if (!team) {
    return next(new ErrorResponse('Invalid invite code', 400));
  }

  const existing = await TeamMember.findOne({ where: { TeamId: team.id, UserId: req.user.id } });
  if (existing) {
    return next(new ErrorResponse('Already a member of this team', 400));
  }

  await team.addMember(req.user.id, { through: { role: 'member' } });

  await Activity.create({
    type: 'member_joined',
    description: `${req.user.name} joined the team`,
    userId: req.user.id,
    metadata: { teamId: team.id }
  });

  res.status(200).json({
    success: true,
    data: team
  });
});

// Leave team
exports.leaveTeam = asyncHandler(async (req, res, next) => {
  const { Team } = req.tenant.models;
  const team = await Team.findByPk(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  if (team.ownerId === req.user.id) {
    return next(new ErrorResponse('Team owner cannot leave the team', 400));
  }

  await team.removeMember(req.user.id);

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Add member
exports.addMember = asyncHandler(async (req, res, next) => {
  const { Team, TeamMember } = req.tenant.models;
  const team = await Team.findByPk(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  const myMembership = await TeamMember.findOne({ where: { TeamId: team.id, UserId: req.user.id } });
  const isAuthorized = team.ownerId === req.user.id ||
    (myMembership && (myMembership.role === 'admin' || myMembership.role === 'lead'));

  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to add members', 403));
  }

  const existing = await TeamMember.findOne({ where: { TeamId: team.id, UserId: parseInt(req.body.userId) } });
  if (existing) {
    return next(new ErrorResponse('User is already a member', 400));
  }

  await team.addMember(req.body.userId, { through: { role: req.body.role || 'member' } });

  res.status(200).json({
    success: true,
    data: team
  });
});

// Remove member
exports.removeMember = asyncHandler(async (req, res, next) => {
  const { Team, TeamMember } = req.tenant.models;
  const team = await Team.findByPk(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  const myMembership = await TeamMember.findOne({ where: { TeamId: team.id, UserId: req.user.id } });
  const isAuthorized = team.ownerId === req.user.id ||
    (myMembership && myMembership.role === 'admin');

  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to remove members', 403));
  }

  await team.removeMember(req.params.userId);

  res.status(200).json({
    success: true,
    data: team
  });
});

// Update member role
exports.updateMemberRole = asyncHandler(async (req, res, next) => {
  const { Team, TeamMember } = req.tenant.models;
  const team = await Team.findByPk(req.params.id);

  if (!team) {
    return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
  }

  const myMembership = await TeamMember.findOne({ where: { TeamId: team.id, UserId: req.user.id } });
  const isAuthorized = team.ownerId === req.user.id ||
    (myMembership && myMembership.role === 'admin');

  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to update member roles', 403));
  }

  const member = await TeamMember.findOne({ where: { TeamId: team.id, UserId: req.params.userId } });

  if (!member) {
    return next(new ErrorResponse('Member not found', 404));
  }

  member.role = req.body.role;
  await member.save();

  res.status(200).json({
    success: true,
    data: team
  });
});