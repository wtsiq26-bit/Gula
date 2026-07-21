// ──────────────────────────────────────────────────────────────
// Gula PMS — Medicine Controller (Phase 2)
// Full CRUD for medicines with image upload, search,
// barcode lookup, and pharmacy-scoped queries.
// ──────────────────────────────────────────────────────────────

const prisma = require("../config/db");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

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

// ─── POST /api/medicines/import ──────────────────────────────
const importExcel = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, message: "Excel file is empty." });
    }

    const validRecords = [];
    for (const row of data) {
      const tradeName = String(row["TRADE NAME"] || row["Trade Name"] || "").trim();
      if (!tradeName) continue;

      const scientificName = String(row["SCIENTIFIC  NAME"] || row["SCIENTIFIC NAME"] || "").trim();
      const manufacturer = String(row["Authorization holder (Manufacturer)"] || row["Manufacturer"] || "").trim();
      const country = String(row["NATIONALITY OF THE MANUFACTURER)"] || row["NATIONALITY OF THE MANUFACTURER"] || "").trim();
      const dosageForm = String(row["PACKAGING & DOSAGE FORM"] || row["Dosage Form"] || "").trim();
      const nationalCode = String(row["N.code"] || row["N.Code"] || "").trim();

      validRecords.push({
        id: crypto.randomUUID(),
        pharmacyId,
        tradeName,
        scientificName: scientificName || null,
        manufacturer: manufacturer || null,
        country: country || null,
        dosageForm: dosageForm || null,
        nationalCode: nationalCode || null,
        barcode: null,
      });
    }

    if (validRecords.length === 0) {
      return res.status(400).json({ success: false, message: "No valid rows found to import." });
    }

    // Chunk insertion in batches of 200 to prevent SQLite parameter limit crash (5200+ records)
    const BATCH_SIZE = 200;
    let importedCount = 0;

    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);
      const result = await prisma.medicine.createMany({
        data: batch,
      });
      importedCount += result.count;
    }

    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {}

    return res.status(200).json({ 
      success: true, 
      message: `تم استيراد ${importedCount} دواء بنجاح في قاعدة البيانات.`, 
      count: importedCount 
    });
  } catch (error) {
    console.error("[Medicine] Import Excel error:", error);
    return res.status(500).json({ success: false, message: "فشل استيراد الأدوية من ملف Excel." });
  }
};

// ─── GET /api/medicines/dictionary/search ──────────────────────
// Search the global dictionary (all medicines, specifically OpenFDA seeded data) 
// for generic names, irrespective of the current user's pharmacyId.
// ──────────────────────────────────────────────────────────────
const searchGlobalDictionary = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Use raw query for guaranteed case-insensitive search in SQLite
    // since Prisma's `contains` is case-sensitive for SQLite and mode: 'insensitive' is not supported.
    const searchPattern = `%${q}%`;
    const results = await prisma.$queryRaw`
      SELECT id, genericName, tradeName, category, barcode 
      FROM Medicine 
      WHERE LOWER(genericName) LIKE LOWER(${searchPattern})
      LIMIT 10
    `;

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("[Medicine] Global Dictionary Search error:", error);
    return res.status(500).json({ success: false, message: "Failed to search dictionary." });
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
  searchGlobalDictionary,
  importExcel,
};
