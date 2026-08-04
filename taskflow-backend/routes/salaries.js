const express = require('express');
const {
  getSalaryDetails,
  upsertSalaryDetail,
  getPayouts,
  createPayout,
  updatePayout,
  deletePayout
} = require('../controllers/salaryController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/', getSalaryDetails);
router.post('/detail', upsertSalaryDetail);
router.get('/payouts', getPayouts);
router.post('/payouts', createPayout);
router.put('/payouts/:id', updatePayout);
router.delete('/payouts/:id', deletePayout);

module.exports = router;
