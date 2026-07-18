// ──────────────────────────────────────────────────────────────
// Gula PMS — Supplier Routes
// ──────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

router.use(protect);

router.get("/", getSuppliers);
router.get("/:id", getSupplierById);
router.post("/", createSupplier);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

module.exports = router;
