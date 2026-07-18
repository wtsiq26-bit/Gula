// ──────────────────────────────────────────────────────────────
// Gula PMS — Supplier Controller (Phase 4)
// Full CRUD for supplier companies that supply medicines.
// ──────────────────────────────────────────────────────────────

const prisma = require("../config/db");

// ─── GET /api/suppliers ──────────────────────────────────────
const getSuppliers = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { search } = req.query;

    const where = { pharmacyId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: { _count: { select: { medicines: true } } },
      orderBy: { name: "asc" },
    });

    return res.status(200).json({ success: true, data: suppliers });
  } catch (error) {
    console.error("[Supplier] GetAll error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch suppliers." });
  }
};

// ─── GET /api/suppliers/:id ──────────────────────────────────
const getSupplierById = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { id } = req.params;

    const supplier = await prisma.supplier.findFirst({
      where: { id, pharmacyId },
      include: {
        medicines: { select: { id: true, tradeName: true, stock: true, sellingPrice: true } },
        _count: { select: { medicines: true } },
      },
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found." });
    }

    return res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    console.error("[Supplier] GetById error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch supplier." });
  }
};

// ─── POST /api/suppliers ─────────────────────────────────────
const createSupplier = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { name, contactPerson, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Supplier name is required." });
    }

    const supplier = await prisma.supplier.create({
      data: { name, contactPerson, phone, email, address, pharmacyId },
    });

    return res.status(201).json({ success: true, message: "Supplier added successfully.", data: supplier });
  } catch (error) {
    console.error("[Supplier] Create error:", error);
    return res.status(500).json({ success: false, message: "Failed to add supplier." });
  }
};

// ─── PUT /api/suppliers/:id ──────────────────────────────────
const updateSupplier = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { id } = req.params;
    const { name, contactPerson, phone, email, address } = req.body;

    const existing = await prisma.supplier.findFirst({ where: { id, pharmacyId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Supplier not found." });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: name || existing.name,
        contactPerson: contactPerson !== undefined ? contactPerson : existing.contactPerson,
        phone: phone !== undefined ? phone : existing.phone,
        email: email !== undefined ? email : existing.email,
        address: address !== undefined ? address : existing.address,
      },
    });

    return res.status(200).json({ success: true, message: "Supplier updated successfully.", data: supplier });
  } catch (error) {
    console.error("[Supplier] Update error:", error);
    return res.status(500).json({ success: false, message: "Failed to update supplier." });
  }
};

// ─── DELETE /api/suppliers/:id ───────────────────────────────
const deleteSupplier = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { id } = req.params;

    const existing = await prisma.supplier.findFirst({ where: { id, pharmacyId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Supplier not found." });
    }

    await prisma.supplier.delete({ where: { id } });
    return res.status(200).json({ success: true, message: "Supplier deleted successfully." });
  } catch (error) {
    console.error("[Supplier] Delete error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete supplier." });
  }
};

module.exports = { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier };
