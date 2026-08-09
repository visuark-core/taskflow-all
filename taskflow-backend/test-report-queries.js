const { Department, User, Team, Project, Task, Activity } = require('./models');
const sequelize = require('./config/db');
const { Op } = require('sequelize');

async function test() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    console.log('\n--- TESTING CEO REPORT QUERIES ---');
    
    const departmentCount = await Department.count({});
    console.log('departmentCount:', departmentCount);

    const projectCount = await Project.count({});
    console.log('projectCount:', projectCount);

    const userCount = await User.count({ where: { id: { [Op.ne]: null } } });
    console.log('userCount:', userCount);

    const tasks = await Task.findAll({});
    console.log('totalTasks:', tasks.length);

    const allProjects = await Project.findAll({});
    console.log('allProjects count:', allProjects.length);

    const departments = await Department.findAll({
      include: [{ model: User, as: 'manager', attributes: ['id', 'name'] }]
    });
    console.log('departments fetched count:', departments.length);

    const recentActivities = await Activity.findAll({
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'avatar'] },
        { model: Project, attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    console.log('recentActivities count:', recentActivities.length);

    console.log('\n--- TESTING CFO REPORT QUERIES ---');
    const totalBudget = departments.reduce((sum, dept) => sum + (dept.budget || 0), 0);
    console.log('totalBudget:', totalBudget);

    console.log('All queries passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during testing queries:', err);
    process.exit(1);
  }
}

test();
