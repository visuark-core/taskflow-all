// routes/activities.js
const express = require('express');
const { protect } = require('../middlewares/auth');
const {
  getActivities,
  getProjectActivities,
  getUserActivities
} = require('../controllers/activityController');

const router = express.Router();

router.use(protect);

router.get('/project/:projectId', getProjectActivities);
router.get('/user/:userId', getUserActivities);
router.get('/', getActivities);

module.exports = router;
