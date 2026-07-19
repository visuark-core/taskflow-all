// routes/departments.js
const express = require('express');
const {
  getDepartments,
  getMyDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  addMember,
  removeMember,
  getDepartmentTeams
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Get all departments (admin only)
router.get('/', authorize('admin'), getDepartments);

// Get current user's managed departments
router.get('/my-departments/list', getMyDepartments);

// Create department (admin only)
router.post('/', authorize('admin'), createDepartment);

// Get single department
router.get('/:id', getDepartment);

// Update department (admin or department manager)
router.put('/:id', updateDepartment);

// Delete department (admin only)
router.delete('/:id', authorize('admin'), deleteDepartment);

// Add member to department
router.post('/:id/members', addMember);

// Remove member from department
router.delete('/:id/members', removeMember);

// Get department teams
router.get('/:id/teams', getDepartmentTeams);

module.exports = router;
