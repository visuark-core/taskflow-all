const express = require('express');
const {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice
} = require('../controllers/invoiceController');
const { protect, authorize, authorizeFinance } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);
router.use(authorizeFinance);

router.get('/', getInvoices);
router.get('/:id', getInvoice);

router.post(
  '/',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'),
  createInvoice
);

router.put(
  '/:id',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'),
  updateInvoice
);

router.delete(
  '/:id',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'),
  deleteInvoice
);

module.exports = router;
