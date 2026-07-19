require('dotenv').config({ path: './taskflow-backend/.env' });
const { User, Team, Project } = require('./taskflow-backend/models');
const sequelize = require('./taskflow-backend/config/db');

async function test() {
  await sequelize.authenticate();
  
  const projects = await Project.findAll({ raw: true });
  console.log('All Projects raw DB state:', projects.map(p => ({ id: p.id, name: p.name, teamId: p.teamId })));
  
  process.exit();
}
test();
