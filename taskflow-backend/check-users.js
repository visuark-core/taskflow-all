require('dotenv').config();
const { User, Team, Project } = require('./models');
const sequelize = require('./config/db');

async function test() {
  await sequelize.authenticate();
  
  const users = await User.findAll({ raw: true });
  console.log('Users:', users.map(u => ({ id: u.id, name: u.name, role: u.role })));
  
  const teams = await Team.findAll({ raw: true });
  console.log('Teams:', teams.map(t => ({ id: t.id, name: t.name, ownerId: t.ownerId })));
  
  const projects = await Project.findAll({ raw: true });
  console.log('Projects:', projects.map(p => ({ id: p.id, name: p.name, teamId: p.teamId })));
  
  process.exit();
}
test();
