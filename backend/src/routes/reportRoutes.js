const express = require("express");
const router = express.Router();
const { getReports } = require("../controllers/reportController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.get("/", getReports);

module.exports = router;
