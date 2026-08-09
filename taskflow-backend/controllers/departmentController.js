const { Department, User, Team, Activity, DepartmentMember } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

exports.getDepartments = asyncHandler(async (req, res, next) => {
  const authorizedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'];
  if (!authorizedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to view all departments', 403));
  }

  const departments = await Department.findAll({
    where: { status: 'active' },
    include: [
      { model: User, as: 'departmentManager', attributes: ['id', 'name', 'email', 'avatar'] },
      { model: Team, attributes: ['id', 'name', 'description'] },
      { model: User, as: 'members', attributes: ['id', 'name', 'email', 'avatar'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({ success: true, count: departments.length, data: departments });
});

exports.getMyDepartments = asyncHandler(async (req, res, next) => {
  const departments = await Department.findAll({
    where: { managerId: req.user.id, status: 'active' },
    include: [
      { model: Team, attributes: ['id', 'name', 'description', 'ownerId'] },
      { model: User, as: 'members', attributes: ['id', 'name', 'email', 'avatar'] },
      { model: User, as: 'departmentManager', attributes: ['id', 'name', 'email', 'avatar'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({ success: true, count: departments.length, data: departments });
});

exports.getDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findByPk(req.params.id, {
    include: [
      { model: User, as: 'departmentManager', attributes: ['id', 'name', 'email', 'avatar'] },
      { model: Team, attributes: ['id', 'name', 'description', 'ownerId'] },
      { model: User, as: 'members', attributes: ['id', 'name', 'email', 'avatar'] },
      { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] }
    ]
  });

  if (!department) return next(new ErrorResponse('Department not found', 404));

  const isAdminOrExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'].includes(req.user.role);
  const isManager = department.managerId === req.user.id;
  const isMember = department.members.some(m => m.id === req.user.id);

  if (!isAdminOrExecutive && !isManager && !isMember) {
    return next(new ErrorResponse('Not authorized', 403));
  }

  res.status(200).json({ success: true, data: department });
});

exports.createDepartment = asyncHandler(async (req, res, next) => {
  const allowedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to create departments', 403));
  }

  const { name, description, manager: managerId, budget, settings } = req.body;
  
  let managerUser = null;
  if (managerId) {
    managerUser = await User.findByPk(managerId);
    if (!managerUser) return next(new ErrorResponse('Manager not found', 404));
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

  const fullDept = await Department.findByPk(department.id, { include: [{ model: User, as: 'departmentManager' }] });
  res.status(201).json({ success: true, data: fullDept });
});

exports.updateDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findByPk(req.params.id);
  if (!department) return next(new ErrorResponse('Department not found', 404));

  const isAdminOrExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo'].includes(req.user.role);
  const isManager = department.managerId === req.user.id;

  if (!isAdminOrExecutive && !isManager) return next(new ErrorResponse('Not authorized', 403));

  const fieldsToUpdate = { ...req.body };
  delete fieldsToUpdate.managerId;
  delete fieldsToUpdate.createdById;

  if (req.user.role === 'admin' && req.body.hasOwnProperty('manager') && req.body.manager !== department.managerId) {
    if (req.body.manager) {
      const newManager = await User.findByPk(req.body.manager);
      if (!newManager) return next(new ErrorResponse('New manager not found', 404));

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
  const updatedDept = await Department.findByPk(department.id, { include: [{ model: User, as: 'departmentManager' }] });
  res.status(200).json({ success: true, data: updatedDept });
});

exports.deleteDepartment = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'admin') return next(new ErrorResponse('Only admins can delete', 403));

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
  const department = await Department.findByPk(req.params.id, { include: [{ model: User, as: 'members' }] });
  if (!department) return next(new ErrorResponse('Department not found', 404));

  const isAdminOrExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo'].includes(req.user.role);
  const isManager = department.managerId === req.user.id;
  if (!isAdminOrExecutive && !isManager) return next(new ErrorResponse('Not authorized', 403));

  const isMember = department.members.some(m => m.id === parseInt(req.body.userId));
  if (isMember) return next(new ErrorResponse('Already a member', 400));

  await department.addMember(req.body.userId, { through: { role: req.body.role || 'member' } });
  
  res.status(200).json({ success: true, data: department });
});

exports.removeMember = asyncHandler(async (req, res, next) => {
  const department = await Department.findByPk(req.params.id);
  if (!department) return next(new ErrorResponse('Department not found', 404));

  const isAdminOrExecutive = ['admin', 'ceo', 'cfo', 'cto', 'cmo'].includes(req.user.role);
  const isManager = department.managerId === req.user.id;
  if (!isAdminOrExecutive && !isManager) return next(new ErrorResponse('Not authorized', 403));

  await department.removeMember(req.body.userId);
  res.status(200).json({ success: true, data: department });
});

exports.getDepartmentTeams = asyncHandler(async (req, res, next) => {
  const department = await Department.findByPk(req.params.id, {
    include: [{
      model: Team,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name'] },
        { model: User, as: 'members', attributes: ['id', 'name'] }
      ]
    }]
  });

  if (!department) return next(new ErrorResponse('Department not found', 404));
  res.status(200).json({ success: true, count: department.Teams ? department.Teams.length : 0, data: department.Teams });
});
