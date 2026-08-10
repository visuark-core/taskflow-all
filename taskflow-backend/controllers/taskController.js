const { Task, Project, User, Activity, TaskComment, TaskAttachment, TaskLabel } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');

const updateProjectStatus = async (projectId) => {
  if (!projectId) return;
  const project = await Project.findByPk(projectId);
  if (!project) return;

  const tasks = await Task.findAll({ where: { projectId } });
  
  if (tasks.length === 0) return;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;

  let newStatus = project.status;
  if (completedTasks === totalTasks && totalTasks > 0) {
    newStatus = 'completed';
  } else if (totalTasks > 0) {
    if (['planning', 'completed'].includes(project.status)) {
      newStatus = 'active';
    }
  }

  if (newStatus !== project.status) {
    await project.update({ status: newStatus });
  }
};

exports.getAllTasks = asyncHandler(async (req, res, next) => {
  const tasks = await Task.findAll({
    include: [
      { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
      { model: Project, attributes: ['id', 'name'] },
      { model: TaskLabel, as: 'labels' }
    ],
    order: [['position', 'ASC'], ['createdAt', 'DESC']]
  });

  res.status(200).json({ success: true, count: tasks.length, data: tasks });
});

exports.getTasks = asyncHandler(async (req, res, next) => {
  const tasks = await Task.findAll({
    where: { projectId: req.params.projectId },
    include: [
      { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
      { model: Project, attributes: ['id', 'name'] },
      { model: TaskLabel, as: 'labels' }
    ],
    order: [['position', 'ASC'], ['createdAt', 'DESC']]
  });

  res.status(200).json({ success: true, count: tasks.length, data: tasks });
});

exports.getMyTasks = asyncHandler(async (req, res, next) => {
  const tasks = await Task.findAll({
    where: {
      [Op.or]: [
        { assigneeId: req.user.id },
        { assignedById: req.user.id }
      ]
    },
    include: [
      { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
      { model: Project, attributes: ['id', 'name'] },
      { model: TaskLabel, as: 'labels' }
    ],
    order: [['position', 'ASC'], ['createdAt', 'DESC']]
  });

  res.status(200).json({ success: true, count: tasks.length, data: tasks });
});

exports.getTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findByPk(req.params.id, {
    include: [
      { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
      { model: User, as: 'assignedBy', attributes: ['id', 'name', 'avatar'] },
      { model: Project, attributes: ['id', 'name'] },
      { model: TaskComment, as: 'comments', include: [{ model: User, attributes: ['id', 'name', 'avatar'] }] },
      { model: TaskAttachment, as: 'attachments' },
      { model: TaskLabel, as: 'labels' }
    ]
  });

  if (!task) return next(new ErrorResponse('Task not found', 404));
  res.status(200).json({ success: true, data: task });
});

exports.createTask = asyncHandler(async (req, res, next) => {
  const allowedRoles = ['admin', 'ceo', 'chief_manager', 'department_manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to create tasks', 403));
  }

  req.body.assignedById = req.user.id;
  
  if (req.body.project) {
    req.body.projectId = req.body.project;
  }
  if (req.body.assignee) {
    req.body.assigneeId = req.body.assignee;
  }

  const projId = req.body.projectId;
  if (projId && req.body.dueDate) {
    const project = await Project.findByPk(projId);
    if (project && project.dueDate) {
      const projDate = new Date(project.dueDate);
      const taskDate = new Date(req.body.dueDate);
      if (taskDate > projDate) {
        return next(new ErrorResponse(`Task due date cannot be after the project's deadline (${project.dueDate.toISOString().split('T')[0]})`, 400));
      }
    }
  }

  const task = await Task.create(req.body);

  await Activity.create({
    userId: req.user.id,
    projectId: task.projectId,
    taskId: task.id,
    type: 'task_created',
    description: `Created task ${task.title}`
  });

  await updateProjectStatus(task.projectId);

  res.status(201).json({ success: true, data: task });
});

exports.updateTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findByPk(req.params.id);
  if (!task) return next(new ErrorResponse('Task not found', 404));

  // If user is just the assignee (not admin/manager and not the creator), they can only update status/checklist
  const isManagerOrAdmin = ['admin', 'chief_manager', 'ceo', 'cfo', 'cmo', 'cto'].includes(req.user.role);
  const isAssigneeOnly = !isManagerOrAdmin && task.assignedById !== req.user.id && task.assigneeId === req.user.id;
  if (isAssigneeOnly) {
    const allowedKeys = ['checklist', 'status'];
    const attemptedKeys = Object.keys(req.body);
    const unauthorizedKeys = attemptedKeys.filter(key => !allowedKeys.includes(key));
    if (unauthorizedKeys.length > 0) {
      return next(new ErrorResponse('Assignees are not authorized to edit core task details', 403));
    }
    
    if (req.body.status && req.body.status.toLowerCase() === 'done') {
      return next(new ErrorResponse('Only managers and admins can mark a task as done', 403));
    }
  }

  if (req.body.project) {
    req.body.projectId = req.body.project;
  }
  if (req.body.assignee) {
    req.body.assigneeId = req.body.assignee;
  }

  const projId = req.body.projectId || task.projectId;
  if (projId && req.body.dueDate) {
    const project = await Project.findByPk(projId);
    if (project && project.dueDate) {
      const projDate = new Date(project.dueDate);
      const taskDate = new Date(req.body.dueDate);
      if (taskDate > projDate) {
        return next(new ErrorResponse(`Task due date cannot be after the project's deadline (${project.dueDate.toISOString().split('T')[0]})`, 400));
      }
    }
  }

  await task.update(req.body);

  await updateProjectStatus(task.projectId);

  res.status(200).json({ success: true, data: task });
});

exports.deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findByPk(req.params.id);
  if (!task) return next(new ErrorResponse('Task not found', 404));

  const isManagerOrAdmin = ['admin', 'chief_manager', 'ceo', 'cfo', 'cmo', 'cto'].includes(req.user.role);
  if (!isManagerOrAdmin && task.assignedById !== req.user.id) {
    return next(new ErrorResponse('Not authorized to delete this task', 403));
  }

  const projId = task.projectId;
  await task.destroy();

  await updateProjectStatus(projId);

  res.status(200).json({ success: true, data: {} });
});

exports.addComment = asyncHandler(async (req, res, next) => {
  const comment = await TaskComment.create({
    text: req.body.text,
    taskId: req.params.id,
    userId: req.user.id
  });

  res.status(201).json({ success: true, data: comment });
});

exports.reorderTasks = asyncHandler(async (req, res, next) => {
  const { taskId, newStatus, newPosition } = req.body;
  const task = await Task.findByPk(taskId);
  if (!task) return next(new ErrorResponse('Task not found', 404));

  const isManagerOrAdmin = ['admin', 'chief_manager', 'ceo', 'cfo', 'cmo', 'cto'].includes(req.user.role);
  const isAssigneeOnly = !isManagerOrAdmin && task.assignedById !== req.user.id && task.assigneeId === req.user.id;

  if (isAssigneeOnly && newStatus && newStatus.toLowerCase() === 'done') {
    return next(new ErrorResponse('Only managers and admins can mark a task as done', 403));
  }

  await task.update({
    status: newStatus,
    position: newPosition || 0
  });

  await updateProjectStatus(task.projectId);

  res.status(200).json({ success: true, data: task });
});

exports.addAttachment = asyncHandler(async (req, res, next) => {
  const cloudinary = require('../config/cloudinary');
  const fs = require('fs');

  if (!req.file) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  const task = await Task.findByPk(req.params.id);
  if (!task) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return next(new ErrorResponse('Task not found', 404));
  }

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'taskflow/attachments',
      resource_type: 'auto',
    });

    const attachment = await TaskAttachment.create({
      filename: req.file.originalname,
      url: result.secure_url,
      taskId: task.id
    });

    // Clean up local temp file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({ success: true, data: attachment });
  } catch (uploadErr) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return next(new ErrorResponse('Cloudinary upload failed: ' + uploadErr.message, 500));
  }
});
