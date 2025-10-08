// controllers/taskController.js
const Task = require('../models/Task');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Get all tasks for a project
exports.getTasks = asyncHandler(async (req, res, next) => {
  const tasks = await Task.find({ project: req.params.projectId })
    .populate('assignee', 'name email avatar')
    .populate('assignedBy', 'name email avatar')
    .sort('position');

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

// Get single task
exports.getTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate('assignee', 'name email avatar')
    .populate('assignedBy', 'name email avatar')
    .populate('project', 'name')
    .populate('comments.user', 'name email avatar');

  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: task
  });
});

// Create new task
exports.createTask = asyncHandler(async (req, res, next) => {
  req.body.assignedBy = req.user.id;

  // Check if project exists and user has access
  const project = await Project.findById(req.body.project);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  const hasAccess = project.owner.equals(req.user.id) || 
                   project.members.some(member => member.user.equals(req.user.id));

  if (!hasAccess) {
    return next(new ErrorResponse('Not authorized to create tasks in this project', 403));
  }

  const task = await Task.create(req.body);

  // Create activity
  await Activity.create({
    type: 'task_created',
    description: `${req.user.name} created task "${task.title}"`,
    user: req.user.id,
    project: project._id,
    task: task._id
  });

  // Create notification if task is assigned
  if (task.assignee && !task.assignee.equals(req.user.id)) {
    await Notification.create({
      recipient: task.assignee,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `${req.user.name} assigned you a new task: ${task.title}`,
      link: `/tasks/${task._id}`,
      relatedProject: project._id,
      relatedTask: task._id
    });
  }

  // Emit socket event
  req.io.to(`project-${project._id}`).emit('task-created', {
    task,
    user: req.user
  });

  res.status(201).json({
    success: true,
    data: task
  });
});

// Update task
exports.updateTask = asyncHandler(async (req, res, next) => {
  let task = await Task.findById(req.params.id);

  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }

  // Track changes for notifications
  const previousAssignee = task.assignee;
  const previousStatus = task.status;

  task = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Create activity
  await Activity.create({
    type: 'task_updated',
    description: `${req.user.name} updated task "${task.title}"`,
    user: req.user.id,
    project: task.project,
    task: task._id,
    metadata: { changes: req.body }
  });

  // Handle notifications
  if (req.body.assignee && req.body.assignee !== previousAssignee?.toString()) {
    // Notify new assignee
    if (req.body.assignee && req.body.assignee !== req.user.id.toString()) {
      await Notification.create({
        recipient: req.body.assignee,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `${req.user.name} assigned you to task: ${task.title}`,
        link: `/tasks/${task._id}`,
        relatedProject: task.project,
        relatedTask: task._id
      });
    }
  }

  // If task was completed, create notification
  if (req.body.status === 'done' && previousStatus !== 'done') {
    await Activity.create({
      type: 'task_completed',
      description: `${req.user.name} completed task "${task.title}"`,
      user: req.user.id,
      project: task.project,
      task: task._id
    });

    // Update project progress
    const project = await Project.findById(task.project);
    project.progress = await project.calculateProgress();
    await project.save();
  }

  // Emit socket event
  req.io.to(`project-${task.project}`).emit('task-updated', {
    task,
    user: req.user
  });

  res.status(200).json({
    success: true,
    data: task
  });
});

// Delete task
exports.deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }

  await task.remove();

  // Emit socket event
  req.io.to(`project-${task.project}`).emit('task-deleted', {
    taskId: task._id,
    projectId: task.project,
    user: req.user
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Add comment to task
exports.addComment = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }

  const comment = {
    user: req.user.id,
    text: req.body.text,
    createdAt: Date.now()
  };

  task.comments.push(comment);
  await task.save();

  // Create activity
  await Activity.create({
    type: 'comment_added',
    description: `${req.user.name} commented on task "${task.title}"`,
    user: req.user.id,
    project: task.project,
    task: task._id,
    metadata: { comment: req.body.text }
  });

  // Notify assignee if comment is from someone else
  if (task.assignee && !task.assignee.equals(req.user.id)) {
    await Notification.create({
      recipient: task.assignee,
      type: 'comment_reply',
      title: 'New Comment',
      message: `${req.user.name} commented on "${task.title}"`,
      link: `/tasks/${task._id}`,
      relatedProject: task.project,
      relatedTask: task._id
    });
  }

  // Emit socket event
  req.io.to(`project-${task.project}`).emit('comment-added', {
    task,
    comment,
    user: req.user
  });

  res.status(200).json({
    success: true,
    data: task
  });
});

// Reorder tasks (drag and drop)
exports.reorderTasks = asyncHandler(async (req, res, next) => {
  const { taskId, newPosition, newStatus } = req.body;

  const task = await Task.findById(taskId);
  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  // Update task position and status
  task.position = newPosition;
  if (newStatus) {
    task.status = newStatus;
  }
  await task.save();

  // Update positions of other tasks
  const tasksToReorder = await Task.find({
    project: task.project,
    status: task.status,
    _id: { $ne: taskId }
  }).sort('position');

  let position = 0;
  for (const t of tasksToReorder) {
    if (position === newPosition) position++;
    t.position = position;
    await t.save();
    position++;
  }

  // Emit socket event
  req.io.to(`project-${task.project}`).emit('tasks-reordered', {
    projectId: task.project,
    taskId,
    newPosition,
    newStatus
  });

  res.status(200).json({
    success: true,
    data: { message: 'Tasks reordered successfully' }
  });
});

