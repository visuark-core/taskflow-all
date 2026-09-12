const asyncHandler = require('../utils/asyncHandler');

// Helper to get project IDs the user has access to
async function getAccessibleProjectIds(user, models) {
  const { Team, Task, Project, TeamMember, ProjectMember } = models;
  const userTeamRows = await TeamMember.findAll({ where: { UserId: user.id } });
  const userTeamIds = new Set(userTeamRows.map(tm => tm.TeamId));
  const userTeams = await Team.findAll({});

  const myTeamIds = userTeams
    .filter(t => t.ownerId === user.id || userTeamIds.has(t.id))
    .map(t => t.id);

  const myTasks = await Task.findAll({
    where: { assigneeId: user.id },
    attributes: ['projectId']
  });
  const myTaskProjectIds = [...new Set(myTasks.map(t => t.projectId).filter(id => id != null))];

  const myMemberships = await ProjectMember.findAll({ where: { UserId: user.id } });
  const memberProjectIds = new Set(myMemberships.map(m => m.ProjectId));

  const projects = await Project.findAll({});

  const userProjects = projects.filter(p =>
    p.ownerId === user.id ||
    memberProjectIds.has(p.id) ||
    (p.teamId && myTeamIds.includes(p.teamId)) ||
    myTaskProjectIds.includes(p.id)
  );

  return userProjects.map(p => p.id);
}

// Get all activities (dashboard feed, scoped to user's projects)
exports.getActivities = asyncHandler(async (req, res, next) => {
  const { Activity, Project, Task } = req.tenant.models;
  const projectIds = await getAccessibleProjectIds(req.user, req.tenant.models);

  const activities = await Activity.findAll({
    where: {
      projectId: projectIds
    },
    include: [
      { model: Project, attributes: ['id', 'name'] },
      { model: Task, attributes: ['id', 'title'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: 100
  });

  const userMap = await req.tenant.getUsers(activities.map(a => a.userId));
  activities.forEach(a => {
    if (a.dataValues) {
      a.setDataValue('User', userMap[a.userId] || null);
      a.setDataValue('user', userMap[a.userId] || null);
    }
  });

  res.status(200).json({ success: true, count: activities.length, data: activities });
});

// Get activities for a project
exports.getProjectActivities = asyncHandler(async (req, res, next) => {
  const { Activity, Project, Task } = req.tenant.models;
  // Check project access
  const projectIds = await getAccessibleProjectIds(req.user, req.tenant.models);
  const projectId = parseInt(req.params.projectId);

  if (!projectIds.includes(projectId)) {
    return res.status(403).json({ success: false, error: 'Not authorized to access activities of this project' });
  }

  const activities = await Activity.findAll({
    where: { projectId },
    include: [
      { model: Project, attributes: ['id', 'name'] },
      { model: Task, attributes: ['id', 'title'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  const userMap = await req.tenant.getUsers(activities.map(a => a.userId));
  activities.forEach(a => {
    a.setDataValue('User', userMap[a.userId] || null);
    a.setDataValue('user', userMap[a.userId] || null);
  });

  res.status(200).json({ success: true, count: activities.length, data: activities });
});

// Get activities for a user
exports.getUserActivities = asyncHandler(async (req, res, next) => {
  const { Activity, Project, Task } = req.tenant.models;
  const activities = await Activity.findAll({
    where: { userId: req.params.userId },
    include: [
      { model: Project, attributes: ['id', 'name'] },
      { model: Task, attributes: ['id', 'title'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  const userMap = await req.tenant.getUsers(activities.map(a => a.userId));
  activities.forEach(a => {
    a.setDataValue('User', userMap[a.userId] || null);
    a.setDataValue('user', userMap[a.userId] || null);
  });

  res.status(200).json({ success: true, count: activities.length, data: activities });
});