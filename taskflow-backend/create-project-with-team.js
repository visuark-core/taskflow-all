require('dotenv').config();
const { User, Team, Project } = require('./models');
const sequelize = require('./config/db');

async function test() {
  await sequelize.authenticate();
  
  // Find a chief manager user
  const users = await User.findAll({ where: { role: 'chief_manager' } });
  if (users.length === 0) { console.log('No chief managers found'); process.exit(); }
  const manager = users[0];
  
  // Find a team
  const teams = await Team.findAll();
  if (teams.length === 0) { console.log('No teams found'); process.exit(); }
  const team = teams[0];
  console.log('Using Team:', team.id, team.name);
  
  // Create a project assigned to this team
  const project = await Project.create({
    name: 'Test Project for Team',
    description: 'This should show up for the manager',
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    teamId: team.id,
    ownerId: 1 // Assume admin is ID 1
  });
  
  console.log('Created Project:', project.id, project.name, 'with teamId:', project.teamId);
  
  process.exit();
}
test();
