// ──────────────────────────────────────────────────────────────
// Gula PMS — Sale Routes
// ──────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { createSale, getSales, getSaleById, generateInvoice } = require("../controllers/saleController");

router.use(protect);

router.post("/", createSale);
router.get("/", getSales);
router.get("/:id", getSaleById);
router.get("/:id/invoice", generateInvoice);

module.exports = router;
