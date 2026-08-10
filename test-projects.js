require('./taskflow-backend/node_modules/dotenv').config({ path: './taskflow-backend/.env' });
const { User, Team, Project } = require('./taskflow-backend/models');
const sequelize = require('./taskflow-backend/config/db');

async function test() {
  await sequelize.authenticate();
  
  // Find a manager user
  const users = await User.findAll({ where: { role: 'chief_manager' } });
  if (users.length === 0) { console.log('No managers found'); process.exit(); }
  const manager = users[0];
  console.log('Manager ID:', manager.id, manager.name);
  
  const userTeams = await Team.findAll({
    include: [{ model: User, as: 'members' }]
  });
  
  const myTeamIds = userTeams
    .filter(t => t.ownerId === manager.id || t.members.some(m => m.id === manager.id))
    .map(t => t.id);
    
  console.log('Manager Team IDs:', myTeamIds);
  
  const projects = await Project.findAll({
    include: [
      { model: User, as: 'owner', attributes: ['id', 'name'] },
      { model: Team, attributes: ['id', 'name'] },
      { model: User, as: 'members', attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'DESC']]
  });
  
  for (const p of projects) {
    const isOwner = p.ownerId === manager.id;
    const isMember = p.members.some(m => m.id === manager.id);
    const isTeamMatch = p.teamId && myTeamIds.includes(p.teamId);
    
    if (isTeamMatch && !isOwner && !isMember) {
      console.log(`Match via Team! Project ${p.id} (teamId: ${p.teamId})`);
    } else if (isOwner || isMember) {
      console.log(`Match via direct! Project ${p.id} (ownerId: ${p.ownerId})`);
    }
  }
  
  process.exit();
}
test();
