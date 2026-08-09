const express = require('express');
const {
  getServices,
  createService,
  updateService,
  deleteService
} = require('../controllers/serviceController');
const { protect, authorize, authorizeFinance } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);
router.use(authorizeFinance);

router.get('/', getServices);

router.post(
  '/',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'),
  createService
);

router.put(
  '/:id',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'),
  updateService
);

router.delete(
  '/:id',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'),
  deleteService
);

module.exports = router;
