require('dotenv').config();
const { User, Team, Project } = require('./models');
const sequelize = require('./config/db');

async function test() {
  await sequelize.authenticate();
  
  const projects = await Project.findAll({ raw: true });
  console.log('All Projects raw DB state:', projects.map(p => ({ id: p.id, name: p.name, teamId: p.teamId })));
  
  process.exit();
}
test();
