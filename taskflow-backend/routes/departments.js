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

// Get all departments (admin and executives)
router.get('/', authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'), getDepartments);

// Get current user's managed departments
router.get('/my-departments/list', getMyDepartments);

// Create department (admin and executives)
router.post('/', authorize('admin', 'ceo', 'cfo', 'cto', 'cmo'), createDepartment);

// Get single department
router.get('/:id', getDepartment);

// Update department (admin or department manager)
router.put('/:id', updateDepartment);

// Delete department (admin and executives)
router.delete('/:id', authorize('admin', 'ceo', 'cfo', 'cto', 'cmo'), deleteDepartment);

// Add member to department
router.post('/:id/members', addMember);

// Remove member from department
router.delete('/:id/members', removeMember);

// Get department teams
router.get('/:id/teams', getDepartmentTeams);

module.exports = router;
