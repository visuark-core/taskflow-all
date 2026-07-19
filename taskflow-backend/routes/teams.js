const express = require('express');
const { protect } = require('../middlewares/auth');
const {
  getTeams,
  getTeamsByDepartment,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  joinTeam,
  leaveTeam,
  addMember,
  removeMember,
  updateMemberRole
} = require('../controllers/teamController');

const router = express.Router();

router.use(protect);

// Get all teams for user
router.get('/', getTeams);

// Get teams by department
router.get('/department/:departmentId', getTeamsByDepartment);

// Create new team
router.post('/', createTeam);

// Get single team
router.get('/:id', getTeam);

// Update team
router.put('/:id', updateTeam);

// Delete team
router.delete('/:id', deleteTeam);

// Join team with invite code
router.post('/join', joinTeam);

// Leave team
router.post('/:id/leave', leaveTeam);

// Add member to team
router.post('/:id/members', addMember);

// Remove member from team
router.delete('/:id/members/:userId', removeMember);

// Update member role
router.put('/:id/members/:userId', updateMemberRole);

module.exports = router;
