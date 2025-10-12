// routes/tasks.js
const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  reorderTasks
} = require('../controllers/taskController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

router
  .route('/')
  .post(createTask);

// Specific routes first to avoid collisions with the param route
router.get('/project/:projectId', getTasks);
router.post('/:id/comments', addComment);
router.put('/reorder', reorderTasks);

router
  .route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;

