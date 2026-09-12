const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const ATTRS = ['id', 'name', 'email', 'avatar'];

exports.getDepartments = asyncHandler(async (req, res, next) => {
  const { Department, Team, DepartmentMember } = req.tenant.models;
  const authorizedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'];
  if (!authorizedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to view all departments', 403));
  }

  const departments = await Department.findAll({
    where: { status: 'active' },
    include: [
      { model: Team, attributes: ['id', 'name', 'description'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  const dmRows = await DepartmentMember.findAll({});
  const userIds = [
    ...departments.map(d => d.managerId),
    ...departments.map(d => d.createdById),
    ...dmRows.map(m => m.UserId)
  ];
  const userMap = await req.tenant.getUsers(userIds, ATTRS);
  departments.forEach(department => {
    department.setDataValue('departmentManager', userMap[department.managerId] || null);
    department.setDataValue('createdBy', userMap[department.createdById] || null);
    const mids = dmRows.filter(m => m.DepartmentId === department.id).map(m => m.UserId);
    department.setDataValue('members', mids.map(id => userMap[id]).filter(Boolean));
  });

  res.status(200).json({ success: true, count: departments.length, data: departments });
});

exports.getMyDepartments = asyncHandler(async (req, res, next) => {
  const { Department, Team, DepartmentMember } = req.tenant.models;
  const departments = await Department.findAll({
    where: { managerId: req.user.id, status: 'active' },
    include: [
      { model: Team, attributes: ['id', 'name', 'description', 'ownerId'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  const dmRows = await DepartmentMember.findAll({ where: { DepartmentId: departments.map(d => d.id) } });
  const userIds = [...departments.map(d => d.managerId), ...dmRows.map(m => m.UserId)];
  const userMap = await req.tenant.getUsers(userIds, ATTRS);
  departments.forEach(department => {
    department.setDataValue('members', dmRows.filter(m => m.DepartmentId === department.id).map(m => userMap[m.UserId]).filter(Boolean));
    department.setDataValue('departmentManager', userMap[department.managerId] || null);
  });

  res.status(200).json({ success: true, count: departments.length, data: departments });
});

exports.getDepartment = asyncHandler(async (req, res, next) => {
  const { Department, Team, DepartmentMember } = req.tenant.models;
  const department = await Department.findByPk(req.params.id, {
    include: [
      { model: Team, attributes: ['id', 'name', 'description', 'ownerId'] }
    ]
  });

  if (!department) return next(new ErrorResponse('Department not found', 404));

  const dmRows = await DepartmentMember.findAll({ where: { DepartmentId: department.id } });
  const userMap = await req.tenant.getUsers(
    [department.managerId, department.createdById, ...dmRows.map(m => m.UserId)],
    ATTRS
  );
  department.setDataValue('departmentManager', userMap[department.managerId] || null);
  department.setDataValue('createdBy', userMap[department.createdById] || null);
  department.setDataValue('members', dmRows.map(m => userMap[m.UserId]).filter(Boolean));

  const isAdminOrExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'].includes(req.user.role);
  const isManager = department.managerId === req.user.id;
  const isMember = department.members.some(m => m.id === req.user.id);

  if (!isAdminOrExecutive && !isManager && !isMember) {
    return next(new ErrorResponse('Not authorized', 403));
  }

  res.status(200).json({ success: true, data: department });
});

exports.createDepartment = asyncHandler(async (req, res, next) => {
  const { Department, Activity } = req.tenant.models;
  const allowedRoles = ['admin', 'ceo', 'chief_manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to create departments', 403));
  }

  const { name, description, manager: managerId, budget, settings } = req.body;

  let managerUser = null;
  if (managerId) {
    managerUser = await User.findByPk(managerId);
    if (!managerUser) return next(new ErrorResponse('Manager not found', 404));
    if (managerUser.role === 'admin' || managerUser.role === 'ceo') {
      return next(new ErrorResponse('Admins and CEOs cannot be assigned as department managers', 400));
    }
  }

  const department = await Department.create({
    name,
    description,
    budget,
    settings,
    createdById: req.user.id,
    managerId: managerId || null
  });

  if (managerUser) {
    await managerUser.update({ role: 'department_manager', managedDepartmentId: department.id });
    await department.addMember(managerId, { through: { role: 'lead' } });
  }

  await Activity.create({
    userId: req.user.id,
    type: 'project_created', // generic type for this example since 'department_created' might not be in enum
    description: `Created department: ${name}`,
    metadata: { departmentId: department.id }
  });

  const fullDept = await Department.findByPk(department.id);
  if (fullDept.managerId) {
    const userMap = await req.tenant.getUsers([fullDept.managerId], ATTRS);
    fullDept.setDataValue('departmentManager', userMap[fullDept.managerId] || null);
  }
  res.status(201).json({ success: true, data: fullDept });
});

exports.updateDepartment = asyncHandler(async (req, res, next) => {
  const { Department } = req.tenant.models;
  const department = await Department.findByPk(req.params.id);
  if (!department) return next(new ErrorResponse('Department not found', 404));

  const isAdminOrExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'].includes(req.user.role);
  const isManager = department.managerId === req.user.id;

  if (!isAdminOrExecutive && !isManager) return next(new ErrorResponse('Not authorized', 403));

  const fieldsToUpdate = { ...req.body };
  delete fieldsToUpdate.managerId;
  delete fieldsToUpdate.createdById;

  if (req.user.role === 'admin' && req.body.hasOwnProperty('manager') && req.body.manager !== department.managerId) {
    if (req.body.manager) {
      const newManager = await User.findByPk(req.body.manager);
      if (!newManager) return next(new ErrorResponse('New manager not found', 404));
      if (newManager.role === 'admin' || newManager.role === 'ceo') {
        return next(new ErrorResponse('Admins and CEOs cannot be assigned as department managers', 400));
      }

      if (department.managerId) {
        await User.update({ role: 'user', managedDepartmentId: null }, { where: { id: department.managerId } });
      }
      await newManager.update({ role: 'department_manager', managedDepartmentId: department.id });
      fieldsToUpdate.managerId = req.body.manager;
    } else {
      if (department.managerId) {
        await User.update({ role: 'user', managedDepartmentId: null }, { where: { id: department.managerId } });
      }
      fieldsToUpdate.managerId = null;
    }
  }

  await department.update(fieldsToUpdate);
  const updatedDept = await Department.findByPk(department.id);
  if (updatedDept.managerId) {
    const userMap = await req.tenant.getUsers([updatedDept.managerId], ATTRS);
    updatedDept.setDataValue('departmentManager', userMap[updatedDept.managerId] || null);
  }
  res.status(200).json({ success: true, data: updatedDept });
});

exports.deleteDepartment = asyncHandler(async (req, res, next) => {
  const { Department, Team } = req.tenant.models;
  const allowedRoles = ['admin', 'ceo', 'chief_manager'];
  if (!allowedRoles.includes(req.user.role)) return next(new ErrorResponse('Not authorized to delete departments', 403));

  const department = await Department.findByPk(req.params.id, { include: [Team] });
  if (!department) return next(new ErrorResponse('Department not found', 404));

  if (department.Teams && department.Teams.length > 0) {
    await Team.update({ departmentId: null }, { where: { departmentId: department.id } });
  }

  if (department.managerId) {
    await User.update({ role: 'user', managedDepartmentId: null }, { where: { id: department.managerId } });
  }

  await department.destroy();
  res.status(200).json({ success: true, data: {} });
});

exports.addMember = asyncHandler(async (req, res, next) => {
  const { Department, DepartmentMember } = req.tenant.models;
  const department = await Department.findByPk(req.params.id);
  if (!department) return next(new ErrorResponse('Department not found', 404));

  const isAdminOrExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo'].includes(req.user.role);
  const isManager = department.managerId === req.user.id;
  if (!isAdminOrExecutive && !isManager) return next(new ErrorResponse('Not authorized', 403));

  const existing = await DepartmentMember.findOne({ where: { DepartmentId: department.id, UserId: parseInt(req.body.userId) } });
  if (existing) return next(new ErrorResponse('Already a member', 400));

  await department.addMember(req.body.userId, { through: { role: req.body.role || 'member' } });

  res.status(200).json({ success: true, data: department });
});

exports.removeMember = asyncHandler(async (req, res, next) => {
  const { Department } = req.tenant.models;
  const department = await Department.findByPk(req.params.id);
  if (!department) return next(new ErrorResponse('Department not found', 404));

  const isAdminOrExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo'].includes(req.user.role);
  const isManager = department.managerId === req.user.id;
  if (!isAdminOrExecutive && !isManager) return next(new ErrorResponse('Not authorized', 403));

  await department.removeMember(req.body.userId);
  res.status(200).json({ success: true, data: department });
});

exports.getDepartmentTeams = asyncHandler(async (req, res, next) => {
  const { Department, Team, TeamMember } = req.tenant.models;
  const department = await Department.findByPk(req.params.id, {
    include: [{ model: Team }]
  });

  if (!department) return next(new ErrorResponse('Department not found', 404));

  const teams = department.Teams || [];
  const tmRows = await TeamMember.findAll({ where: { TeamId: teams.map(t => t.id) } });
  const userMap = await req.tenant.getUsers(
    [...teams.map(t => t.ownerId), ...tmRows.map(m => m.UserId)],
    ['id', 'name']
  );
  teams.forEach(team => {
    team.setDataValue('owner', userMap[team.ownerId] || null);
    const mids = tmRows.filter(m => m.TeamId === team.id).map(m => m.UserId);
    team.setDataValue('members', mids.map(id => userMap[id]).filter(Boolean));
  });

  res.status(200).json({ success: true, count: teams.length, data: teams });
});