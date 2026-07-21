// ──────────────────────────────────────────────────────────────
// Gula PMS — Medicine Routes
// ──────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const upload = require("../config/multer");
const {
  getMedicines,
  getMedicineById,
  getMedicineByBarcode,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getCategories,
  searchGlobalDictionary,
  importExcel,
  getExpiryAlerts,
  linkMedicineStock,
} = require("../controllers/medicineController");

// All routes require authentication
router.use(protect);

router.get("/alerts/expiry", getExpiryAlerts);
router.get("/dictionary/search", searchGlobalDictionary);
router.get("/", getMedicines);
router.get("/categories/list", getCategories);
router.get("/barcode/:barcode", getMedicineByBarcode);
router.get("/:id", getMedicineById);
router.post("/link", linkMedicineStock);
router.post("/import", upload.single("file"), importExcel);
router.post("/", upload.single("image"), createMedicine);
router.put("/:id", upload.single("image"), updateMedicine);
router.delete("/:id", deleteMedicine);

module.exports = router;

