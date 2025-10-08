// controllers/reportController.js
const Task = require('../models/Task');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Get dashboard statistics
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  // Get user's projects
  const projects = await Project.find({
    $or: [
      { owner: req.user.id },
      { 'members.user': req.user.id }
    ]
  });

  const projectIds = projects.map(p => p._id);

  // Get tasks
  const tasks = await Task.find({ project: { $in: projectIds } });

  // Task statistics
  const taskStats = {
    total: tasks.length,
    byStatus: {
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length
    },
    overdue: tasks.filter(t => t.isOverdue).length
  };

  // Project statistics
  const projectStats = {
    total: projects.length,
    byStatus: {
      planning: projects.filter(p => p.status === 'planning').length,
      active: projects.filter(p => p.status === 'active').length,
      onHold: projects.filter(p => p.status === 'on-hold').length,
      completed: projects.filter(p => p.status === 'completed').length
    }
  };

  // Recent activities
  const recentActivities = await Activity.find({ 
    project: { $in: projectIds } 
  })
  .populate('user', 'name email avatar')
  .populate('project', 'name')
  .sort('-createdAt')
  .limit(10);

  // Upcoming deadlines
  const upcomingDeadlines = await Task.find({
    project: { $in: projectIds },
    dueDate: { 
      $gte: new Date(), 
      $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
    },
    status: { $ne: 'done' }
  })
  .populate('assignee', 'name email')
  .populate('project', 'name')
  .sort('dueDate')
  .limit(10);

  res.status(200).json({
    success: true,
    data: {
      taskStats,
      projectStats,
      recentActivities,
      upcomingDeadlines
    }
  });
});

// Get project report
exports.getProjectReport = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.projectId)
    .populate('owner', 'name email')
    .populate('members.user', 'name email');

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check access
  const hasAccess = project.owner.equals(req.user.id) || 
                   project.members.some(m => m.user.equals(req.user.id));

  if (!hasAccess) {
    return next(new ErrorResponse('Not authorized to view this report', 403));
  }

  // Get tasks
  const tasks = await Task.find({ project: req.params.projectId })
    .populate('assignee', 'name email');

  // Task analysis
  const taskAnalysis = {
    total: tasks.length,
    byStatus: {
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length
    },
    byPriority: {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      urgent: tasks.filter(t => t.priority === 'urgent').length
    }
  };

  // Member performance
  const memberPerformance = {};
  project.members.forEach(member => {
    const memberTasks = tasks.filter(t => t.assignee?.equals(member.user._id));
    memberPerformance[member.user._id] = {
      user: member.user,
      totalTasks: memberTasks.length,
      completedTasks: memberTasks.filter(t => t.status === 'done').length,
      inProgressTasks: memberTasks.filter(t => t.status === 'in-progress').length
    };
  });

  // Time tracking
  let totalEstimated = 0;
  let totalLogged = 0;
  tasks.forEach(task => {
    if (task.timeTracking) {
      totalEstimated += task.timeTracking.estimated || 0;
      totalLogged += task.timeTracking.logged || 0;
    }
  });

  // Activities
  const activities = await Activity.find({ project: req.params.projectId })
    .populate('user', 'name email')
    .sort('-createdAt')
    .limit(30);

  res.status(200).json({
    success: true,
    data: {
      project,
      taskAnalysis,
      memberPerformance: Object.values(memberPerformance),
      timeTracking: {
        totalEstimated,
        totalLogged,
        efficiency: totalEstimated > 0 ? (totalLogged / totalEstimated) * 100 : 0
      },
      activities
    }
  });
});

// Get user report
exports.getUserReport = asyncHandler(async (req, res, next) => {
  const userId = req.params.userId === 'me' ? req.user.id : req.params.userId;

  // Get user
  const user = await User.findById(userId).select('name email');
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Get tasks
  const tasks = await Task.find({ assignee: userId })
    .populate('project', 'name');

  // Task statistics
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    overdue: tasks.filter(t => t.isOverdue).length
  };

  // Performance by project
  const projectPerformance = {};
  tasks.forEach(task => {
    if (!projectPerformance[task.project._id]) {
      projectPerformance[task.project._id] = {
        project: task.project,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0
      };
    }
    projectPerformance[task.project._id].totalTasks++;
    if (task.status === 'done') {
      projectPerformance[task.project._id].completedTasks++;
    } else if (task.status === 'in-progress') {
      projectPerformance[task.project._id].inProgressTasks++;
    }
  });

  // Completion trend (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const completionTrend = {};
  
  tasks
    .filter(t => t.status === 'done' && t.updatedAt >= thirtyDaysAgo)
    .forEach(task => {
      const date = task.updatedAt.toISOString().split('T')[0];
      completionTrend[date] = (completionTrend[date] || 0) + 1;
    });

  // Recent activities
  const activities = await Activity.find({ user: userId })
    .populate('project', 'name')
    .sort('-createdAt')
    .limit(20);

  res.status(200).json({
    success: true,
    data: {
      user,
      taskStats,
      projectPerformance: Object.values(projectPerformance),
      completionTrend,
      activities
    }
  });
});

// Get team report
exports.getTeamReport = asyncHandler(async (req, res, next) => {
  const Team = require('../models/Team');
  
  const team = await Team.findById(req.params.teamId)
    .populate('members.user', 'name email')
    .populate('projects', 'name status');

  if (!team) {
    return next(new ErrorResponse('Team not found', 404));
  }

  // Check access
  const hasAccess = team.owner.equals(req.user.id) || 
                   team.members.some(m => m.user.equals(req.user.id));

  if (!hasAccess) {
    return next(new ErrorResponse('Not authorized to view this report', 403));
  }

  // Get all tasks from team projects
  const projectIds = team.projects.map(p => p._id);
  const tasks = await Task.find({ project: { $in: projectIds } })
    .populate('assignee', 'name email');

  // Team performance
  const teamPerformance = {
    totalProjects: team.projects.length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'done').length,
    activeProjects: team.projects.filter(p => p.status === 'active').length
  };

  // Member contributions
  const memberContributions = {};
  team.members.forEach(member => {
    const memberTasks = tasks.filter(t => t.assignee?.equals(member.user._id));
    memberContributions[member.user._id] = {
      user: member.user,
      role: member.role,
      totalTasks: memberTasks.length,
      completedTasks: memberTasks.filter(t => t.status === 'done').length,
      contribution: tasks.length > 0 ? (memberTasks.length / tasks.length) * 100 : 0
    };
  });

  res.status(200).json({
    success: true,
    data: {
      team,
      teamPerformance,
      memberContributions: Object.values(memberContributions)
    }
  });
});

