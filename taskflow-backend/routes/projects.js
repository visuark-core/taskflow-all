// routes/projects.js
const express = require('express');
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  getProjectsByTeamMember,
  getTeamMembers
} = require('../controllers/projectController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

// Get team members (juniors) for the current user - MUST be before /:id route
router.get('/team-members/list', getTeamMembers);

// Get projects by team member - MUST be before /:id route
router.get('/team-member/:memberId', getProjectsByTeamMember);

router
  .route('/')
  .get(getProjects)
  .post(createProject);

router
  .route('/:id')
  .get(getProject)
  .put(updateProject)
  .delete(deleteProject);

router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;
