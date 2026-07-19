// routes/tasks.js
const express = require('express');
const {
  getAllTasks,
  getTasks,
  getMyTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  reorderTasks,
  addAttachment
} = require('../controllers/taskController');
const { protect } = require('../middlewares/auth');
const upload = require('../config/upload');

const router = express.Router();

router.use(protect); // All routes require authentication

router
  .route('/')
  .get(getAllTasks)
  .post(createTask);

// Specific routes first to avoid collisions with the param route
router.get('/me', getMyTasks);
router.get('/project/:projectId', getTasks);
router.post('/:id/comments', addComment);
router.post('/:id/attachments', upload.single('file'), addAttachment);
router.put('/reorder', reorderTasks);

router
  .route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;

