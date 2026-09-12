const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const { getCompanies, checkCompany, createCompany, syncAll } = require("../controllers/companyController");
const router = express.Router();

router.get("/check", checkCompany);
router.get("/", getCompanies);
router.post("/", protect, authorize("admin"), createCompany);
router.post("/sync-all", protect, authorize("admin"), syncAll);

module.exports = router;