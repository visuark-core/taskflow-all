const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');

exports.getProjects = asyncHandler(async (req, res, next) => {
  const { Team, Task, Project, ProjectMember, TeamMember, Client, Service } = req.tenant.models;
  const isAdminOrExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo'].includes(req.user.role);

  // Admins/executives see every project; only run the access-scoping queries
  // for those who need visibility filtering.
  const [
    projects,
    pmRows,
    userTeamRows,
    userTeams,
    myTasks,
    myMemberships
  ] = isAdminOrExecutive
    ? await Promise.all([
        Project.findAll({
          include: [
            { model: Team, attributes: ['id', 'name'] },
            { model: Client, as: 'client', attributes: ['id', 'name', 'company'] },
            { model: Service, as: 'service', attributes: ['id', 'name'] }
          ],
          order: [['createdAt', 'DESC']]
        }),
        ProjectMember.findAll({})
      ])
    : await Promise.all([
        Project.findAll({
          include: [
            { model: Team, attributes: ['id', 'name'] },
            { model: Client, as: 'client', attributes: ['id', 'name', 'company'] },
            { model: Service, as: 'service', attributes: ['id', 'name'] }
          ],
          order: [['createdAt', 'DESC']]
        }),
        ProjectMember.findAll({}),
        TeamMember.findAll({ where: { UserId: req.user.id } }),
        Team.findAll({}),
        Task.findAll({ where: { assigneeId: req.user.id }, attributes: ['projectId'] }),
        ProjectMember.findAll({ where: { UserId: req.user.id } })
      ]);

  const userTeamIds = new Set(userTeamRows.map(tm => tm.TeamId));
  const myTeamIds = userTeams
    .filter(t => t.ownerId === req.user.id || userTeamIds.has(t.id))
    .map(t => t.id);

  const myTaskProjectIds = [...new Set(myTasks.map(t => t.projectId).filter(id => id != null))];

  const memberProjectIds = new Set(myMemberships.map(m => m.ProjectId));

  const memberIds = [...new Set(pmRows.map(m => m.UserId))];
  const userMap = await req.tenant.getUsers([...projects.map(p => p.ownerId), ...memberIds]);
  projects.forEach(p => {
    p.setDataValue('owner', userMap[p.ownerId] || null);
    const mids = pmRows.filter(m => m.ProjectId === p.id).map(m => m.UserId);
    p.setDataValue('members', mids.map(id => userMap[id]).filter(Boolean));
  });

  if (isAdminOrExecutive) {
    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  }

  const userProjects = projects.filter(p =>
    p.ownerId === req.user.id ||
    memberProjectIds.has(p.id) ||
    (p.teamId && myTeamIds.includes(p.teamId)) ||
    myTaskProjectIds.includes(p.id)
  );

  res.status(200).json({
    success: true,
    count: userProjects.length,
    data: userProjects
  });
});

exports.getProject = asyncHandler(async (req, res, next) => {
  const { Team, Task, Project, ProjectMember, TeamMember, Client, Service } = req.tenant.models;
  const project = await Project.findByPk(req.params.id, {
    include: [
      { model: Team, attributes: ['id', 'name'] },
      { model: Client, as: 'client', attributes: ['id', 'name', 'company', 'email', 'phone'] },
      { model: Service, as: 'service', attributes: ['id', 'name', 'rate', 'rateType'] }
    ]
  });

  if (!project) return next(new ErrorResponse('Project not found', 404));

  const isOwner = project.ownerId === req.user.id;
  const isExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo'].includes(req.user.role);

  const [pmRows, team, task] = await Promise.all([
    ProjectMember.findAll({ where: { ProjectId: project.id } }),
    project.teamId ? Team.findByPk(project.teamId) : Promise.resolve(null),
    Task.findOne({ where: { projectId: project.id, assigneeId: req.user.id } })
  ]);
  const userMap = await req.tenant.getUsers([project.ownerId, ...pmRows.map(m => m.UserId)]);

  project.setDataValue('owner', userMap[project.ownerId] || null);
  project.setDataValue('members', pmRows.map(m => userMap[m.UserId]).filter(Boolean));

  const isMember = project.members && project.members.some(m => m.id === req.user.id);

  let isTeamMember = false;
  if (team) {
    const tms = await TeamMember.findAll({ where: { TeamId: team.id } });
    isTeamMember = team.ownerId === req.user.id || tms.some(tm => tm.UserId === req.user.id);
  }

  let hasTaskAssignee = false;
  if (task) {
    hasTaskAssignee = true;
  }

  if (!isExecutive && !isOwner && !isMember && !isTeamMember && !hasTaskAssignee) {
    return next(new ErrorResponse('Not authorized to access this project', 403));
  }

  res.status(200).json({ success: true, data: project });
});

exports.createProject = asyncHandler(async (req, res, next) => {
  const { Project, Team, Activity, Notification } = req.tenant.models;
  const allowedRoles = ['admin', 'ceo', 'chief_manager', 'department_manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to create projects', 403));
  }

  req.body.ownerId = req.user.id;

  if (req.body.dueDate) {
    req.body.endDate = req.body.dueDate;
  }
  if (!req.body.startDate) {
    req.body.startDate = new Date();
  }
  if (!req.body.endDate) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    req.body.endDate = d;
  }

  const project = await Project.create(req.body);

  await project.addMember(req.user.id, { through: { role: 'admin' } });

  await Activity.create({
    userId: req.user.id,
    projectId: project.id,
    type: 'project_created',
    description: `Created project ${project.name}`
  });

  if (req.body.teamId) {
    const team = await Team.findByPk(req.body.teamId);
    if (team && team.ownerId !== req.user.id) {
      await Notification.create({
        recipientId: team.ownerId,
        type: 'project_invite',
        title: 'New Project Assigned',
        message: `Project "${project.name}" has been assigned to your team "${team.name}".`,
        link: `/projects`
      });
    }
  }

  if (req.body.managerId && req.body.managerId !== req.user.id) {
    await project.addMember(req.body.managerId, { through: { role: 'admin' } });
    await Notification.create({
      recipientId: req.body.managerId,
      type: 'project_invite',
      title: 'New Project Assigned',
      message: `You have been assigned as a manager for the project "${project.name}".`,
      link: `/projects`
    });
  }

  res.status(201).json({ success: true, data: project });
});

exports.updateProject = asyncHandler(async (req, res, next) => {
  const { Team, Task, Project, ProjectMember } = req.tenant.models;
  const project = await Project.findByPk(req.params.id, {
    include: [{ model: Team }]
  });
  if (!project) return next(new ErrorResponse('Project not found', 404));

  const isOwner = project.ownerId === req.user.id;
  const isExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo'].includes(req.user.role);
  const isTeamManager = project.Team && project.Team.ownerId === req.user.id;

  if (!isOwner && !isExecutive && !isTeamManager) {
    const member = await ProjectMember.findOne({ where: { ProjectId: project.id, UserId: req.user.id } });
    if (!member || member.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this project', 403));
    }
  }

  if (req.body.dueDate) {
    req.body.endDate = req.body.dueDate;
  }

  if (req.body.endDate) {
    const proposedDate = new Date(req.body.endDate);
    const maxTask = await Task.findOne({
      where: { projectId: project.id, dueDate: { [Op.ne]: null } },
      order: [['dueDate', 'DESC']]
    });
    if (maxTask && maxTask.dueDate) {
      const maxTaskDate = new Date(maxTask.dueDate);
      if (proposedDate < maxTaskDate) {
        return next(new ErrorResponse(`Project deadline cannot be earlier than the latest task due date (${maxTask.dueDate.toISOString().split('T')[0]})`, 400));
      }
    }
  }

  await project.update(req.body);

  res.status(200).json({ success: true, data: project });
});

exports.deleteProject = asyncHandler(async (req, res, next) => {
  const { Project } = req.tenant.models;
  const project = await Project.findByPk(req.params.id);
  if (!project) return next(new ErrorResponse('Project not found', 404));

  const isOwner = project.ownerId === req.user.id;
  const isExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo'].includes(req.user.role);

  if (!isOwner && !isExecutive) {
    return next(new ErrorResponse('Not authorized to delete this project', 403));
  }

  await project.destroy();
  res.status(200).json({ success: true, data: {} });
});

exports.addMember = asyncHandler(async (req, res, next) => {
  const { Project } = req.tenant.models;
  const allowedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Only admins, executives, or managers can add members to a project', 403));
  }

  const project = await Project.findByPk(req.params.id);
  if (!project) return next(new ErrorResponse('Project not found', 404));

  await project.addMember(req.body.userId, { through: { role: req.body.role || 'member' } });
  res.status(200).json({ success: true, data: project });
});

exports.removeMember = asyncHandler(async (req, res, next) => {
  const { Project } = req.tenant.models;
  const allowedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Only admins, executives, or managers can remove members from a project', 403));
  }

  const project = await Project.findByPk(req.params.id);
  if (!project) return next(new ErrorResponse('Project not found', 404));

  await project.removeMember(req.params.userId);
  res.status(200).json({ success: true, data: project });
});

exports.getProjectsByTeamMember = asyncHandler(async (req, res, next) => {
  const { Team, Task, Project, ProjectMember, Client, Service } = req.tenant.models;
  const memberId = req.params.memberId;

  const [memberTasks, projects, pmRows] = await Promise.all([
    Task.findAll({ where: { assigneeId: memberId }, attributes: ['projectId'] }),
    Project.findAll({
      include: [
        { model: Team, attributes: ['id', 'name'] },
        { model: Client, as: 'client', attributes: ['id', 'name', 'company'] },
        { model: Service, as: 'service', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    }),
    ProjectMember.findAll({})
  ]);

  const memberTaskProjectIds = [...new Set(memberTasks.map(t => t.projectId).filter(id => id != null))];

  const memberIds = [...new Set(pmRows.map(m => m.UserId))];
  const userMap = await req.tenant.getUsers([...projects.map(p => p.ownerId), ...memberIds]);
  projects.forEach(p => {
    p.setDataValue('owner', userMap[p.ownerId] || null);
    const mids = pmRows.filter(m => m.ProjectId === p.id).map(m => m.UserId);
    p.setDataValue('members', mids.map(id => userMap[id]).filter(Boolean));
  });

  const filtered = projects.filter(p =>
    p.ownerId == memberId ||
    p.members.some(m => m.id == memberId) ||
    memberTaskProjectIds.includes(p.id)
  );
  res.status(200).json({ success: true, data: filtered });
});

exports.getTeamMembers = asyncHandler(async (req, res, next) => {
  const users = await User.findAll({
    attributes: ['id', 'name', 'email', 'avatar'],
    where: {
      id: { [Op.ne]: req.user.id },
      company: req.user.company
    }
  });

  const normalized = users.map(u => {
    const json = u.toJSON();
    return {
      ...json,
      _id: json.id
    };
  });

  res.status(200).json({ success: true, data: normalized });
});