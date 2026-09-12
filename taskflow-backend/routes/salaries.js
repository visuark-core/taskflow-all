const express = require('express');
const {
  getSalaryDetails,
  upsertSalaryDetail,
  getPayouts,
  createPayout,
  updatePayout,
  deletePayout
} = require('../controllers/salaryController');
const { protect, authorizeFinance } = require('../middlewares/auth');
const tenantRouter = require('../middlewares/tenantRouter');

const router = express.Router();

router.use(protect);
router.use(tenantRouter);
router.use(authorizeFinance);

router.get('/', getSalaryDetails);
router.post('/detail', upsertSalaryDetail);
router.get('/payouts', getPayouts);
router.post('/payouts', createPayout);
router.put('/payouts/:id', updatePayout);
router.delete('/payouts/:id', deletePayout);

module.exports = router;
