const { Task, Project, User, Department, sequelize } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  const [totalProjects, totalTasks, activeUsers, totalDepartments] = await Promise.all([
    Project.count(),
    Task.count(),
    User.count({ where: { isActive: true } }),
    Department.count()
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalProjects,
      totalTasks,
      activeUsers,
      totalDepartments
    }
  });
});
