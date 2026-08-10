const { Client, Project, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
exports.getClients = asyncHandler(async (req, res, next) => {
  const clients = await Client.findAll({
    include: [
      {
        model: Project,
        as: 'projects',
        attributes: ['id', 'name', 'status', 'progress']
      }
    ],
    order: [['name', 'ASC']]
  });

  res.status(200).json({
    success: true,
    count: clients.length,
    data: clients
  });
});

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
exports.getClient = asyncHandler(async (req, res, next) => {
  const client = await Client.findByPk(req.params.id, {
    include: [
      {
        model: Project,
        as: 'projects',
        attributes: ['id', 'name', 'status', 'progress', 'startDate', 'endDate', 'budget'],
        include: [
          { model: User, as: 'owner', attributes: ['id', 'name'] }
        ]
      }
    ]
  });

  if (!client) {
    return next(new ErrorResponse('Client not found', 404));
  }

  res.status(200).json({
    success: true,
    data: client
  });
});

// @desc    Create new client
// @route   POST /api/clients
// @access  Private (Admin/Manager/Executive)
exports.createClient = asyncHandler(async (req, res, next) => {
  const authorizedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'];
  if (!authorizedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to create clients', 403));
  }

  const client = await Client.create(req.body);

  res.status(201).json({
    success: true,
    data: client
  });
});

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private (Admin/Manager/Executive)
exports.updateClient = asyncHandler(async (req, res, next) => {
  const authorizedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'];
  if (!authorizedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to update clients', 403));
  }

  let client = await Client.findByPk(req.params.id);

  if (!client) {
    return next(new ErrorResponse('Client not found', 404));
  }

  client = await client.update(req.body);

  res.status(200).json({
    success: true,
    data: client
  });
});

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private (Admin/Manager/Executive)
exports.deleteClient = asyncHandler(async (req, res, next) => {
  const authorizedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'];
  if (!authorizedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to delete clients', 403));
  }

  const client = await Client.findByPk(req.params.id);

  if (!client) {
    return next(new ErrorResponse('Client not found', 404));
  }

  // Optional: check if client has active projects and handle it or restrict deletion
  // For now, we allow deletion and projects' clientId will set to null automatically due to SET NULL cascade configuration in associations.
  await client.destroy();

  res.status(200).json({
    success: true,
    data: {}
  });
});
