// ──────────────────────────────────────────────────────────────
// Gula PMS — Sale Controller (Phase 3)
// Processes sales, deducts stock atomically, generates
// PDF invoices, and retrieves sale history.
// ──────────────────────────────────────────────────────────────

const prisma = require("../config/db");
const PDFDocument = require("pdfkit");

// ─── POST /api/sales ─────────────────────────────────────────
// Process a new sale. Expects an array of items and a payment method.
// Deducts stock atomically using a Prisma transaction.
// Body: { items: [{ medicineId, quantity }], paymentMethod }
// ──────────────────────────────────────────────────────────────
const createSale = async (req, res) => {
  try {
    const { userId, pharmacyId } = req.user;
    const { items, paymentMethod = "CASH" } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Sale must contain at least one item." });
    }

    // Validate all items and calculate total within a transaction
    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const saleItems = [];

      for (const item of items) {
        const medicine = await tx.medicine.findFirst({
          where: { id: item.medicineId, pharmacyId },
        });

        if (!medicine) {
          throw new Error(`Medicine with ID ${item.medicineId} not found.`);
        }

        if (medicine.stock < item.quantity) {
          throw new Error(`Insufficient stock for "${medicine.tradeName}". Available: ${medicine.stock}, Requested: ${item.quantity}`);
        }

        // Deduct stock
        await tx.medicine.update({
          where: { id: item.medicineId },
          data: { stock: { decrement: item.quantity } },
        });

        const lineTotal = medicine.sellingPrice * item.quantity;
        totalAmount += lineTotal;

        saleItems.push({
          medicineId: item.medicineId,
          quantity: item.quantity,
          unitPrice: medicine.sellingPrice,
          tradeName: medicine.tradeName, // For response
        });
      }

      // Generate robust sequential invoice number based on the latest INV- sale
      const lastSale = await tx.sale.findFirst({
        where: {
          pharmacyId,
          invoiceNumber: { startsWith: "INV-" },
        },
        orderBy: { createdAt: "desc" },
      });

      let nextNumber = 1;
      if (lastSale && lastSale.invoiceNumber) {
        const match = lastSale.invoiceNumber.match(/\d+/);
        if (match) {
          const lastNum = parseInt(match[0], 10);
          if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1;
          }
        }
      }

      // Fail-safe check to guarantee zero collisions
      let invoiceNumber = `INV-${String(nextNumber).padStart(6, "0")}`;
      let exists = await tx.sale.findUnique({ where: { invoiceNumber } });
      while (exists) {
        nextNumber += 1;
        invoiceNumber = `INV-${String(nextNumber).padStart(6, "0")}`;
        exists = await tx.sale.findUnique({ where: { invoiceNumber } });
      }

      // Create the sale record
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          totalAmount,
          paymentMethod,
          userId,
          pharmacyId,
          items: {
            create: saleItems.map(({ medicineId, quantity, unitPrice }) => ({
              medicineId,
              quantity,
              unitPrice,
            })),
          },
        },
        include: {
          items: {
            include: {
              medicine: { select: { tradeName: true, genericName: true, barcode: true } },
            },
          },
          user: { select: { username: true } },
        },
      });

      return sale;
    });

    return res.status(201).json({
      success: true,
      message: "Sale completed successfully.",
      data: result,
    });
  } catch (error) {
    console.error("[Sale] Create error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to process sale.",
    });
  }
};

// ─── GET /api/sales ──────────────────────────────────────────
// List sales with pagination. Supports date range filtering.
// ──────────────────────────────────────────────────────────────
const getSales = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const where = { pharmacyId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: {
            include: {
              medicine: { select: { tradeName: true, genericName: true } },
            },
          },
          user: { select: { username: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.sale.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: sales,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("[Sale] GetAll error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch sales." });
  }
};

// ─── GET /api/sales/:id ──────────────────────────────────────
const getSaleById = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { id } = req.params;

    const sale = await prisma.sale.findFirst({
      where: { id, pharmacyId },
      include: {
        items: {
          include: {
            medicine: { select: { tradeName: true, genericName: true, barcode: true } },
          },
        },
        user: { select: { username: true } },
        pharmacy: { select: { name: true, location: true } },
      },
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found." });
    }

    return res.status(200).json({ success: true, data: sale });
  } catch (error) {
    console.error("[Sale] GetById error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch sale." });
  }
};

// ─── GET /api/sales/:id/invoice ──────────────────────────────
// Generate and stream a PDF invoice for a sale.
// ──────────────────────────────────────────────────────────────
const generateInvoice = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const { id } = req.params;

    const sale = await prisma.sale.findFirst({
      where: { id, pharmacyId },
      include: {
        items: {
          include: {
            medicine: { select: { tradeName: true, genericName: true, barcode: true } },
          },
        },
        user: { select: { username: true } },
        pharmacy: { select: { name: true, location: true } },
      },
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found." });
    }

    // Create PDF
    const doc = new PDFDocument({ size: [226.77, 600], margin: 10 }); // ~80mm width

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=invoice-${sale.invoiceNumber}.pdf`);
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────
    doc.fontSize(14).font("Helvetica-Bold").text(sale.pharmacy.name, { align: "center" });
    doc.fontSize(8).font("Helvetica").text(sale.pharmacy.location, { align: "center" });
    doc.moveDown(0.3);
    doc.text("─".repeat(35), { align: "center" });
    doc.moveDown(0.3);

    // ── Invoice Details ─────────────────────────────────────
    doc.fontSize(8).font("Helvetica-Bold").text(`Invoice: ${sale.invoiceNumber}`);
    doc.font("Helvetica").text(`Date: ${new Date(sale.createdAt).toLocaleString()}`);
    doc.text(`Cashier: ${sale.user.username}`);
    doc.text(`Payment: ${sale.paymentMethod}`);
    doc.moveDown(0.3);
    doc.text("─".repeat(35), { align: "center" });
    doc.moveDown(0.3);

    // ── Items Table ─────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(7);
    doc.text("Item                   Qty   Price    Total", { align: "left" });
    doc.font("Helvetica").fontSize(7);
    doc.moveDown(0.2);

    for (const item of sale.items) {
      const name = item.medicine.tradeName.substring(0, 20).padEnd(20);
      const qty = String(item.quantity).padStart(3);
      const price = item.unitPrice.toString().padStart(8);
      const total = (item.quantity * item.unitPrice).toString().padStart(8);
      doc.text(`${name} ${qty} ${price} ${total}`);
    }

    doc.moveDown(0.3);
    doc.text("─".repeat(35), { align: "center" });
    doc.moveDown(0.3);

    // ── Total ───────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(`TOTAL: ${sale.totalAmount} IQD`, { align: "right" });
    doc.moveDown(0.5);

    // ── Footer ──────────────────────────────────────────────
    doc.font("Helvetica").fontSize(7);
    doc.text("Thank you for your purchase!", { align: "center" });
    doc.text("Powered by Gula PMS", { align: "center" });

    doc.end();
  } catch (error) {
    console.error("[Sale] Invoice generation error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate invoice." });
  }
};

module.exports = { createSale, getSales, getSaleById, generateInvoice };
