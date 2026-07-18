// ──────────────────────────────────────────────────────────────
// Gula PMS — Medicine Controller (Phase 2)
// Full CRUD for medicines with image upload, search,
// barcode lookup, and pharmacy-scoped queries.
// ──────────────────────────────────────────────────────────────

const prisma = require("../config/db");
const fs = require("fs");
const path = require("path");

// ─── GET /api/medicines ──────────────────────────────────────
// List all medicines for the authenticated user's pharmacy.
// Supports search by tradeName/genericName/barcode and
// filtering by category, supplier, low stock, expiring soon.
// ──────────────────────────────────────────────────────────────
const getMedicines = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { search, category, supplierId, lowStock, expiringSoon, page = 1, limit = 50 } = req.query;

    // Build where clause
    const where = { pharmacyId };

    // Search across tradeName, genericName, barcode
    if (search) {
      where.OR = [
        { tradeName: { contains: search } },
        { genericName: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    if (category) where.category = category;
    if (supplierId) where.supplierId = supplierId;
    if (lowStock === "true") where.stock = { lte: 10 };

    if (expiringSoon === "true") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.expiryDate = { lte: thirtyDaysFromNow };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [medicines, total] = await Promise.all([
      prisma.medicine.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.medicine.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: medicines,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("[Medicine] GetAll error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch medicines." });
  }
};

// ─── GET /api/medicines/barcode/:barcode ─────────────────────
// Lookup a single medicine by barcode (used by POS scanner).
// ──────────────────────────────────────────────────────────────
const getMedicineByBarcode = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { barcode } = req.params;

    const medicine = await prisma.medicine.findFirst({
      where: { barcode, pharmacyId },
      include: { supplier: { select: { id: true, name: true } } },
    });

    if (!medicine) {
      return res.status(404).json({ success: false, message: "Medicine not found with this barcode." });
    }

    return res.status(200).json({ success: true, data: medicine });
  } catch (error) {
    console.error("[Medicine] Barcode lookup error:", error);
    return res.status(500).json({ success: false, message: "Failed to lookup medicine." });
  }
};

// ─── GET /api/medicines/:id ──────────────────────────────────
const getMedicineById = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { id } = req.params;

    const medicine = await prisma.medicine.findFirst({
      where: { id, pharmacyId },
      include: { supplier: { select: { id: true, name: true } } },
    });

    if (!medicine) {
      return res.status(404).json({ success: false, message: "Medicine not found." });
    }

    return res.status(200).json({ success: true, data: medicine });
  } catch (error) {
    console.error("[Medicine] GetById error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch medicine." });
  }
};

// ─── POST /api/medicines ─────────────────────────────────────
// Create a new medicine. Image is handled by Multer middleware.
// ──────────────────────────────────────────────────────────────
const createMedicine = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { tradeName, genericName, category, barcode, costPrice, sellingPrice, stock, expiryDate, supplierId } = req.body;

    if (!tradeName) {
      return res.status(400).json({ success: false, message: "Trade name is required." });
    }

    // Check barcode uniqueness if provided
    if (barcode) {
      const existing = await prisma.medicine.findUnique({ where: { barcode } });
      if (existing) {
        return res.status(409).json({ success: false, message: "A medicine with this barcode already exists." });
      }
    }

    const medicine = await prisma.medicine.create({
      data: {
        tradeName,
        genericName: genericName || null,
        category: category || null,
        barcode: barcode || null,
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        stock: parseInt(stock) || 0,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        image: req.file ? `/uploads/${req.file.filename}` : null,
        supplierId: supplierId || null,
        pharmacyId,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    return res.status(201).json({ success: true, message: "Medicine added successfully.", data: medicine });
  } catch (error) {
    console.error("[Medicine] Create error:", error);
    return res.status(500).json({ success: false, message: "Failed to add medicine." });
  }
};

// ─── PUT /api/medicines/:id ──────────────────────────────────
const updateMedicine = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { id } = req.params;
    const { tradeName, genericName, category, barcode, costPrice, sellingPrice, stock, expiryDate, supplierId } = req.body;

    // Verify ownership
    const existing = await prisma.medicine.findFirst({ where: { id, pharmacyId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Medicine not found." });
    }

    // Check barcode uniqueness if changed
    if (barcode && barcode !== existing.barcode) {
      const barcodeExists = await prisma.medicine.findUnique({ where: { barcode } });
      if (barcodeExists) {
        return res.status(409).json({ success: false, message: "A medicine with this barcode already exists." });
      }
    }

    // If a new image is uploaded, delete the old one
    if (req.file && existing.image) {
      const oldImagePath = path.join(__dirname, "..", "..", existing.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    const medicine = await prisma.medicine.update({
      where: { id },
      data: {
        tradeName: tradeName || existing.tradeName,
        genericName: genericName !== undefined ? genericName : existing.genericName,
        category: category !== undefined ? category : existing.category,
        barcode: barcode !== undefined ? (barcode || null) : existing.barcode,
        costPrice: costPrice !== undefined ? parseFloat(costPrice) : existing.costPrice,
        sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : existing.sellingPrice,
        stock: stock !== undefined ? parseInt(stock) : existing.stock,
        expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : existing.expiryDate,
        image: req.file ? `/uploads/${req.file.filename}` : existing.image,
        supplierId: supplierId !== undefined ? (supplierId || null) : existing.supplierId,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    return res.status(200).json({ success: true, message: "Medicine updated successfully.", data: medicine });
  } catch (error) {
    console.error("[Medicine] Update error:", error);
    return res.status(500).json({ success: false, message: "Failed to update medicine." });
  }
};

// ─── DELETE /api/medicines/:id ───────────────────────────────
const deleteMedicine = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { id } = req.params;

    const existing = await prisma.medicine.findFirst({ where: { id, pharmacyId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Medicine not found." });
    }

    // Delete image file if exists
    if (existing.image) {
      const imagePath = path.join(__dirname, "..", "..", existing.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await prisma.medicine.delete({ where: { id } });
    return res.status(200).json({ success: true, message: "Medicine deleted successfully." });
  } catch (error) {
    console.error("[Medicine] Delete error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete medicine." });
  }
};

// ─── GET /api/medicines/categories/list ──────────────────────
const getCategories = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const medicines = await prisma.medicine.findMany({
      where: { pharmacyId, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
    });
    const categories = medicines.map((m) => m.category).filter(Boolean);
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error("[Medicine] Categories error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch categories." });
  }
};

module.exports = {
  getMedicines,
  getMedicineById,
  getMedicineByBarcode,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getCategories,
};
