const express = require('express');
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient
} = require('../controllers/clientController');
const { protect, authorize, authorizeFinance } = require('../middlewares/auth');

const router = express.Router();

// Protect all routes under /api/clients
router.use(protect);
router.use(authorizeFinance);

// GET all clients
router.get('/', getClients);

// GET a single client
router.get('/:id', getClient);

// POST create client (restricted to managers and executives/admins)
router.post(
  '/',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'),
  createClient
);

// PUT update client (restricted)
router.put(
  '/:id',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'),
  updateClient
);

// DELETE client (restricted)
router.delete(
  '/:id',
  authorize('admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'),
  deleteClient
);

module.exports = router;
