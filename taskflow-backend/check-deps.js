require('dotenv').config();
const { Department } = require('./models');
const sequelize = require('./config/db');

async function test() {
  await sequelize.authenticate();
  const deps = await Department.findAll({ raw: true });
  console.log('Departments:', deps.map(d => ({ id: d.id, name: d.name, managerId: d.managerId })));
  process.exit();
}
test();
