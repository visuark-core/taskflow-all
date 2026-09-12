const express = require('express');
const { protect } = require('../middlewares/auth');
const { tenantRouter } = require('../middlewares/tenantRouter');
const upload = require('../config/upload');
const {
  getUsers,
  getTeamMembers,
  uploadAvatar,
  updateCurrentUser,
  createUser,
  getUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

const router = express.Router();

// Apply authentication middleware globally
router.use(protect);

// Global-only routes (User lives in the primary DB)
router.put('/me', updateCurrentUser);
router.delete('/:id', deleteUser);

// Everything below resolves tenant models from the company workspace
router.use(tenantRouter);

router.get('/my-team-members', getTeamMembers);
router.post('/avatar', upload.single('avatar'), uploadAvatar);

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser);

module.exports = router;