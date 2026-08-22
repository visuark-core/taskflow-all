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
    include: [
      { model: User, as: 'manager', attributes: ['id', 'name'] },
      { model: Team, attributes: ['id'] },
      { model: User, as: 'members', attributes: ['id'] }
    ]
  });

  const departmentBreakdown = departments.map(dept => {
    return {
      id: dept.id,
      name: dept.name,
      manager: dept.manager?.name || 'Unassigned',
      memberCount: dept.members?.length || 0,
      teamCount: dept.Teams?.length || 0,
      status: dept.status || 'active'
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
    include: [
      { model: User, as: 'manager', attributes: ['id', 'name'] },
      { model: User, as: 'members', attributes: ['id'] }
    ]
  });
  const totalBudget = departments.reduce((sum, dept) => sum + (dept.budget || 0), 0);

  const projects = await Project.findAll({});
  const totalAllocation = projects.reduce((sum, proj) => sum + (proj.budget || 0), 0);

  const userCount = await User.count({});

  const departmentBreakdown = departments.map(dept => ({
    id: dept.id,
    name: dept.name,
    budget: dept.budget || 0,
    memberCount: dept.members?.length || 0,
    manager: dept.manager?.name || 'Unassigned',
    status: dept.status || 'active'
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
  const devsByRole = await User.count({ where: { role: 'developer' } });
  const testersByRole = await User.count({ where: { role: 'tester' } });
  const designersByRole = await User.count({ where: { role: 'designer' } });

  const techDepts = await Department.findAll({
    where: {
      name: {
        [Op.or]: [
          { [Op.iLike]: '%eng%' },
          { [Op.iLike]: '%tech%' },
          { [Op.iLike]: '%dev%' },
          { [Op.iLike]: '%soft%' }
        ]
      }
    },
    include: [{ model: User, as: 'members', attributes: ['id', 'role'] }]
  });

  let developersCount = devsByRole;
  let testersCount = testersByRole;
  let designersCount = designersByRole;

  techDepts.forEach(dept => {
    dept.members?.forEach(m => {
      if (m.role === 'developer') {
        // already counted
      } else if (m.role === 'tester') {
        // already counted
      } else if (m.role === 'designer') {
        // already counted
      } else if (m.role === 'user') {
        const deptName = dept.name.toLowerCase();
        if (deptName.includes('qa') || deptName.includes('test')) {
          testersCount++;
        } else if (deptName.includes('design') || deptName.includes('ux') || deptName.includes('ui')) {
          designersCount++;
        } else {
          developersCount++;
        }
      }
    });
  });

  const totalTech = developersCount + testersCount + designersCount;

  const allProjects = await Project.findAll({
    include: [{
      model: Team,
      include: [Department]
    }]
  });

  const isTechProject = (p) => {
    const deptName = p.Team?.Department?.name?.toLowerCase();
    if (deptName) {
      return ['eng', 'tech', 'dev', 'qa', 'product', 'design', 'soft', 'it'].some(kw => deptName.includes(kw));
    }
    const projText = `${p.name} ${p.description} ${JSON.stringify(p.tags || [])}`.toLowerCase();
    return ['eng', 'tech', 'dev', 'qa', 'code', 'software', 'app', 'system', 'build'].some(kw => projText.includes(kw));
  };

  const techProjects = allProjects.filter(isTechProject);
  const techProjectIds = techProjects.map(p => p.id);

  const tasks = await Task.findAll({
    where: {
      projectId: { [Op.in]: techProjectIds }
    }
  });

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

  const topTechnicalProjects = techProjects
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      name: p.name,
      progress: p.progress,
      status: p.status,
      owner: 'System'
    }));

  res.status(200).json({
    success: true,
    data: {
      workforce: {
        developers: developersCount,
        testers: testersCount,
        designers: designersCount,
        totalTech: totalTech
      },
      taskStatus: taskStatusBreakdown,
      priorities: priorityBreakdown,
      topTechnicalProjects: topTechnicalProjects,
      totalTasks: tasks.length
    }
  });
}));

// Get Company-wide CMO dashboard statistics
router.get('/cmo', authorize('admin', 'cmo'), asyncHandler(async (req, res) => {
  const explicitMarketers = await User.count({ where: { role: 'marketer' } });

  const mktDepts = await Department.findAll({
    where: {
      name: {
        [Op.or]: [
          { [Op.iLike]: '%market%' },
          { [Op.iLike]: '%growth%' },
          { [Op.iLike]: '%sale%' },
          { [Op.iLike]: '%pr%' },
          { [Op.iLike]: '%brand%' }
        ]
      }
    },
    include: [{ model: User, as: 'members', attributes: ['id', 'role'] }]
  });

  let marketingPersonnel = explicitMarketers;
  mktDepts.forEach(dept => {
    dept.members?.forEach(m => {
      if (m.role === 'marketer') {
        // already counted
      } else if (m.role === 'user') {
        marketingPersonnel++;
      }
    });
  });

  const allProjects = await Project.findAll({
    include: [{
      model: Team,
      include: [Department]
    }]
  });

  const isMarketingProject = (p) => {
    const deptName = p.Team?.Department?.name?.toLowerCase();
    if (deptName) {
      return ['market', 'growth', 'sale', 'pr', 'brand', 'cmo', 'campaign', 'social'].some(kw => deptName.includes(kw));
    }
    const projText = `${p.name} ${p.description} ${JSON.stringify(p.tags || [])}`.toLowerCase();
    return ['market', 'growth', 'sale', 'pr', 'brand', 'campaign', 'social', 'ad'].some(kw => projText.includes(kw));
  };

  const marketingProjects = allProjects.filter(isMarketingProject);
  const marketingProjectIds = marketingProjects.map(p => p.id);

  const tasks = await Task.findAll({
    where: {
      projectId: { [Op.in]: marketingProjectIds }
    }
  });

  const taskStatusBreakdown = {
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress' || t.status === 'active').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done' || t.status === 'completed').length
  };

  const topCampaigns = marketingProjects
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      name: p.name,
      progress: p.progress,
      status: p.status,
      owner: 'System'
    }));

  res.status(200).json({
    success: true,
    data: {
      workforce: {
        totalMarketing: marketingPersonnel,
        supportStaff: Math.ceil(marketingPersonnel * 0.2)
      },
      campaigns: {
        total: marketingProjects.length,
        active: marketingProjects.filter(p => p.status === 'active').length,
        completed: marketingProjects.filter(p => p.status === 'completed').length
      },
      taskStatus: taskStatusBreakdown,
      topCampaigns: topCampaigns,
      engagementVelocity: tasks.length > 0 ? Math.round((taskStatusBreakdown.done / tasks.length) * 100) : 0
    }
  });
}));

module.exports = router;
