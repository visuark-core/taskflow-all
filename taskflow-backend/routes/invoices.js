const express = require('express');
const {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoicePayments,
  addInvoicePayment,
  deleteInvoicePayment
} = require('../controllers/invoiceController');
const { protect, authorize, authorizeFinance } = require('../middlewares/auth');
const tenantRouter = require('../middlewares/tenantRouter');

const router = express.Router();

router.use(protect);
router.use(tenantRouter);
router.use(authorizeFinance);

router.get('/', getInvoices);
router.get('/:id', getInvoice);

router.get('/:id/payments', getInvoicePayments);
router.post(
  '/:id/payments',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'),
  addInvoicePayment
);
router.delete(
  '/:id/payments/:paymentId',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'),
  deleteInvoicePayment
);

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
