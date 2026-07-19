// routes/reports.js
const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const { Project, User, Team, Task, Activity, Department } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect);

// Get productivity trend (last 7 days)
router.get('/productivity', asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const tasks = await Task.findAll({
    where: {
      [Op.or]: [
        { createdAt: { [Op.gte]: sevenDaysAgo } },
        { updatedAt: { [Op.gte]: sevenDaysAgo } }
      ]
    }
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const trendData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayName = days[d.getDay()];
    
    const isSameDay = (date1, date2) => {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    };

    const newTasks = tasks.filter(t => isSameDay(t.createdAt, d)).length;
    const completedTasks = tasks.filter(t => 
      isSameDay(t.updatedAt, d) && 
      (t.status === 'done' || t.status === 'completed')
    ).length;

    trendData.push({
      name: dayName,
      new: newTasks,
      completed: completedTasks
    });
  }

  res.status(200).json({
    success: true,
    data: trendData
  });
}));

// Get dashboard stats
router.get('/dashboard', asyncHandler(async (req, res) => {
  const projects = await Project.findAll({
    include: [
      { model: User, as: 'owner', attributes: ['id', 'name'] },
      { model: User, as: 'members', attributes: ['id', 'name'] }
    ]
  });

  const userProjects = projects.filter(p => p.ownerId === req.user.id || p.members?.some(m => m.id === req.user.id));
  const projectIds = userProjects.map(p => p.id);

  const tasks = await Task.findAll({
    where: {
      projectId: { [Op.in]: projectIds }
    }
  });

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress' || t.status === 'active').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done' || t.status === 'completed').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
  };

  const projectStats = {
    total: userProjects.length,
    active: userProjects.filter(p => p.status === 'active').length,
    completed: userProjects.filter(p => p.status === 'completed').length,
    onHold: userProjects.filter(p => p.status === 'on-hold').length
  };

  const recentActivities = await Activity.findAll({
    where: {
      projectId: { [Op.in]: projectIds }
    },
    include: [
      { model: User, attributes: ['id', 'name', 'email', 'avatar'] },
      { model: Project, attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: 10
  });

  const upcomingDeadlines = await Task.findAll({
    where: {
      projectId: { [Op.in]: projectIds },
      dueDate: { [Op.gte]: new Date() },
      status: { [Op.notIn]: ['done', 'completed'] }
    },
    include: [
      { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
      { model: Project, attributes: ['id', 'name'] }
    ],
    order: [['dueDate', 'ASC']],
    limit: 10
  });

  res.status(200).json({
    success: true,
    data: {
      taskStats,
      projectStats,
      recentActivities,
      upcomingDeadlines
    }
  });
}));

// Get project report
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const project = await Project.findByPk(req.params.projectId, {
    include: [
      { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'members', attributes: ['id', 'name', 'email'] }
    ]
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  const tasks = await Task.findAll({
    where: { projectId: req.params.projectId }
  });

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress' || t.status === 'active').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done' || t.status === 'completed').length
  };

  const tasksByPriority = {
    low: tasks.filter(t => t.priority === 'low').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    high: tasks.filter(t => t.priority === 'high').length,
    urgent: tasks.filter(t => t.priority === 'urgent').length
  };

  const memberTasks = {};
  if (project.members) {
    project.members.forEach(member => {
      memberTasks[member.id] = {
        user: member,
        assignedTasks: tasks.filter(t => t.assigneeId === member.id).length,
        completedTasks: tasks.filter(t => t.assigneeId === member.id && (t.status === 'done' || t.status === 'completed')).length
      };
    });
  }

  const activities = await Activity.findAll({
    where: { projectId: req.params.projectId },
    include: [{ model: User, attributes: ['id', 'name', 'email'] }],
    order: [['createdAt', 'DESC']],
    limit: 30
  });

  res.status(200).json({
    success: true,
    data: {
      project,
      tasksByStatus,
      tasksByPriority,
      memberTasks,
      activities,
      timeTracking: {
        totalEstimated: 0,
        totalLogged: 0,
        efficiency: 0
      }
    }
  });
}));

// Get user performance report
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const userId = req.params.userId === 'me' ? req.user.id : req.params.userId;

  const tasks = await Task.findAll({
    where: { assigneeId: userId },
    include: [{ model: Project, attributes: ['id', 'name'] }]
  });

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done' || t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress' || t.status === 'active').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
  };

  const tasksByProject = {};
  tasks.forEach(task => {
    if (task.Project) {
      if (!tasksByProject[task.Project.id]) {
        tasksByProject[task.Project.id] = {
          project: task.Project,
          tasks: 0,
          completed: 0
        };
      }
      tasksByProject[task.Project.id].tasks++;
      if (task.status === 'done' || task.status === 'completed') {
        tasksByProject[task.Project.id].completed++;
      }
    }
  });

  const activities = await Activity.findAll({
    where: { userId },
    include: [{ model: Project, attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  res.status(200).json({
    success: true,
    data: {
      taskStats,
      tasksByProject: Object.values(tasksByProject),
      activities,
      completionTrend: {}
    }
  });
}));

// Get Company-wide CEO dashboard statistics
router.get('/ceo', authorize('admin', 'ceo'), asyncHandler(async (req, res) => {
  const departmentCount = await Department.count({});
  const projectCount = await Project.count({});
  const userCount = await User.count({ where: { id: { [Op.ne]: null } } });
  
  const tasks = await Task.findAll({});
  const totalTasks = tasks.length;

  const allProjects = await Project.findAll({});
  const projectStats = {
    planning: allProjects.filter(p => p.status === 'planning').length,
    active: allProjects.filter(p => p.status === 'active').length,
    completed: allProjects.filter(p => p.status === 'completed').length,
    onHold: allProjects.filter(p => p.status === 'on-hold').length
  };

  const taskStats = {
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress' || t.status === 'active').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done' || t.status === 'completed').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
  };

  const departments = await Department.findAll({
    include: [{ model: User, as: 'manager', attributes: ['id', 'name'] }]
  });

  const departmentBreakdown = departments.map(dept => {
    return {
      id: dept.id,
      name: dept.name,
      manager: dept.manager?.name || 'Unassigned',
      memberCount: 0,
      teamCount: 0,
      status: 'active'
    };
  });

  const recentActivities = await Activity.findAll({
    include: [
      { model: User, attributes: ['id', 'name', 'email', 'avatar'] },
      { model: Project, attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: 20
  });

  res.status(200).json({
    success: true,
    data: {
      counts: {
        users: userCount,
        departments: departmentCount,
        projects: projectCount,
        tasks: totalTasks
      },
      projectStats,
      taskStats,
      departmentBreakdown,
      recentActivities
    }
  });
}));

// Get Company-wide CFO dashboard statistics
router.get('/cfo', authorize('admin', 'cfo'), asyncHandler(async (req, res) => {
  const departments = await Department.findAll({
    include: [{ model: User, as: 'manager', attributes: ['id', 'name'] }]
  });
  const totalBudget = departments.reduce((sum, dept) => sum + (dept.budget || 0), 0);

  const projects = await Project.findAll({});
  const totalAllocation = projects.reduce((sum, proj) => sum + (proj.budget || 0), 0);

  const userCount = await User.count({});

  const departmentBreakdown = departments.map(dept => ({
    id: dept.id,
    name: dept.name,
    budget: dept.budget || 0,
    memberCount: 0,
    manager: dept.manager?.name || 'Unassigned',
    status: 'active'
  }));

  const topProjects = projects
    .filter(p => p.budget > 0)
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      name: p.name,
      budget: p.budget,
      status: p.status,
      progress: p.progress
    }));

  res.status(200).json({
    success: true,
    data: {
      financials: {
        totalBudget,
        totalAllocation,
        remainingBudget: totalBudget - totalAllocation
      },
      counts: {
        users: userCount,
        departments: departments.length,
        projects: projects.length
      },
      departmentBreakdown,
      topProjects
    }
  });
}));

// Get Company-wide CTO dashboard statistics
router.get('/cto', authorize('admin', 'cto'), asyncHandler(async (req, res) => {
  const devs = await User.count({ where: { role: 'developer' } });
  const testers = await User.count({ where: { role: 'tester' } });
  const designers = await User.count({ where: { role: 'designer' } });

  const displayedProjects = await Project.findAll({
    order: [['updatedAt', 'DESC']],
    limit: 5
  });

  const tasks = await Task.findAll({});
  const taskStatusBreakdown = {
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress' || t.status === 'active').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done' || t.status === 'completed').length
  };

  const priorityBreakdown = {
    urgent: tasks.filter(t => t.priority === 'urgent').length,
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length
  };

  res.status(200).json({
    success: true,
    data: {
      workforce: {
        developers: devs,
        testers: testers,
        designers: designers,
        totalTech: devs + testers + designers
      },
      taskStatus: taskStatusBreakdown,
      priorities: priorityBreakdown,
      topTechnicalProjects: displayedProjects.map(p => ({
        id: p.id,
        name: p.name,
        progress: p.progress,
        status: p.status,
        owner: 'System'
      })),
      totalTasks: tasks.length
    }
  });
}));

// Get Company-wide CMO dashboard statistics
router.get('/cmo', authorize('admin', 'cmo'), asyncHandler(async (req, res) => {
  const marketingPersonnel = await User.count({ where: { role: 'marketer' } });
  
  const displayedCampaigns = await Project.findAll({
    order: [['createdAt', 'DESC']],
    limit: 5
  });

  const tasks = await Task.findAll({});
  const taskStatusBreakdown = {
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress' || t.status === 'active').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done' || t.status === 'completed').length
  };

  res.status(200).json({
    success: true,
    data: {
      workforce: {
        totalMarketing: marketingPersonnel,
        supportStaff: Math.ceil(marketingPersonnel * 0.2)
      },
      campaigns: {
        total: displayedCampaigns.length,
        active: displayedCampaigns.filter(p => p.status === 'active').length,
        completed: displayedCampaigns.filter(p => p.status === 'completed').length
      },
      taskStatus: taskStatusBreakdown,
      topCampaigns: displayedCampaigns.map(p => ({
        id: p.id,
        name: p.name,
        progress: p.progress,
        status: p.status,
        owner: 'System'
      })),
      engagementVelocity: tasks.length > 0 ? ((taskStatusBreakdown.done / tasks.length) * 100).toFixed(0) : 0
    }
  });
}));

module.exports = router;
