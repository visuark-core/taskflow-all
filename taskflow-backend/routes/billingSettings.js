const express = require('express');
const { protect, authorize, authorizeFinance } = require('../middlewares/auth');
const tenantRouter = require('../middlewares/tenantRouter');
const upload = require('../config/upload');
const {
  getBillingSettings,
  uploadBillingLogo,
  removeBillingLogo,
  uploadBillingSignature,
  removeBillingSignature
} = require('../controllers/billingSettingsController');

const router = express.Router();

router.use(protect);
router.use(tenantRouter);
router.use(authorizeFinance);

router.get('/', getBillingSettings);

router.post(
  '/logo',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'),
  upload.single('logo'),
  uploadBillingLogo
);

router.delete(
  '/logo',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'),
  removeBillingLogo
);

router.post(
  '/signature',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'),
  upload.single('signature'),
  uploadBillingSignature
);

router.delete(
  '/signature',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'),
  removeBillingSignature
);

module.exports = router;