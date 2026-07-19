const { Activity, User, Project, Task, Team } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// Helper to get project IDs the user has access to
async function getAccessibleProjectIds(user) {
  const userTeams = await Team.findAll({
    include: [{ model: User, as: 'members' }]
  });
  
  const myTeamIds = userTeams
    .filter(t => t.ownerId === user.id || t.members.some(m => m.id === user.id))
    .map(t => t.id);

  const myTasks = await Task.findAll({
    where: { assigneeId: user.id },
    attributes: ['projectId']
  });
  const myTaskProjectIds = [...new Set(myTasks.map(t => t.projectId).filter(id => id != null))];

  const projects = await Project.findAll({
    include: [
      { model: User, as: 'members', attributes: ['id'] }
    ]
  });

  const userProjects = projects.filter(p => 
    p.ownerId === user.id || 
    p.members.some(m => m.id === user.id) ||
    (p.teamId && myTeamIds.includes(p.teamId)) ||
    myTaskProjectIds.includes(p.id)
  );

  return userProjects.map(p => p.id);
}

// Get all activities (dashboard feed, scoped to user's projects)
exports.getActivities = asyncHandler(async (req, res, next) => {
  const projectIds = await getAccessibleProjectIds(req.user);

  const activities = await Activity.findAll({
    where: {
      projectId: projectIds
    },
    include: [
      { model: User, attributes: ['id', 'name', 'avatar'] },
      { model: Project, attributes: ['id', 'name'] },
      { model: Task, attributes: ['id', 'title'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: 100
  });

  res.status(200).json({ success: true, count: activities.length, data: activities });
});

// Get activities for a project
exports.getProjectActivities = asyncHandler(async (req, res, next) => {
  // Check project access
  const projectIds = await getAccessibleProjectIds(req.user);
  const projectId = parseInt(req.params.projectId);

  if (!projectIds.includes(projectId)) {
    return res.status(403).json({ success: false, error: 'Not authorized to access activities of this project' });
  }

  const activities = await Activity.findAll({
    where: { projectId },
    include: [
      { model: User, attributes: ['id', 'name', 'avatar'] },
      { model: Project, attributes: ['id', 'name'] },
      { model: Task, attributes: ['id', 'title'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  res.status(200).json({ success: true, count: activities.length, data: activities });
});

// Get activities for a user
exports.getUserActivities = asyncHandler(async (req, res, next) => {
  const activities = await Activity.findAll({
    where: { userId: req.params.userId },
    include: [
      { model: User, attributes: ['id', 'name', 'avatar'] },
      { model: Project, attributes: ['id', 'name'] },
      { model: Task, attributes: ['id', 'title'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  res.status(200).json({ success: true, count: activities.length, data: activities });
});
