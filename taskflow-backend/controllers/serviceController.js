const { Service } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all services
// @route   GET /api/services
// @access  Private
exports.getServices = asyncHandler(async (req, res, next) => {
  const services = await Service.findAll({
    order: [['name', 'ASC']]
  });

  res.status(200).json({
    success: true,
    count: services.length,
    data: services
  });
});

// @desc    Create a service
// @route   POST /api/services
// @access  Private (Admin/Manager/Executive)
exports.createService = asyncHandler(async (req, res, next) => {
  const authorizedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'];
  if (!authorizedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to create services', 403));
  }

  const { name } = req.body;
  const exists = await Service.findOne({ where: { name } });
  if (exists) {
    return next(new ErrorResponse('Service name already exists', 400));
  }

  const service = await Service.create(req.body);

  res.status(201).json({
    success: true,
    data: service
  });
});

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private (Admin/Manager/Executive)
exports.updateService = asyncHandler(async (req, res, next) => {
  const authorizedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'];
  if (!authorizedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to update services', 403));
  }

  let service = await Service.findByPk(req.params.id);

  if (!service) {
    return next(new ErrorResponse('Service not found', 404));
  }

  service = await service.update(req.body);

  res.status(200).json({
    success: true,
    data: service
  });
});

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private (Admin/Manager/Executive)
exports.deleteService = asyncHandler(async (req, res, next) => {
  const authorizedRoles = ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'];
  if (!authorizedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to delete services', 403));
  }

  const service = await Service.findByPk(req.params.id);

  if (!service) {
    return next(new ErrorResponse('Service not found', 404));
  }

  await service.destroy();

  res.status(200).json({
    success: true,
    data: {}
  });
});
