const express = require('express');
const { protect } = require('../middlewares/auth');
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

router.get('/my-team-members', getTeamMembers);
router.post('/avatar', upload.single('avatar'), uploadAvatar);
router.put('/me', updateCurrentUser);

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;