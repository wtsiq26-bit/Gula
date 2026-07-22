// Gula PMS - Multi-Tenant FEFO Checkout & Sales API Route Handler (Updated)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/getAuthSession";

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session?.pharmacyId) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالإجراء." },
        { status: 401 }
      );
    }

    // CRITICAL: Extract pharmacyId and userId securely from session token - NEVER trust client body!
    const currentPharmacyId = session.pharmacyId;
    const activeUserId = session.userId;

    const body = await request.json();
    const { items, paymentMethod = "CASH" } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "يجب أن تحتوي الفاتورة على دواء واحد على الأقل." },
        { status: 400 }
      );
    }

    // Wrap entire FEFO checkout loop in a Prisma Transaction for absolute integrity
    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const saleItemsToCreate = [];

      for (const item of items) {
        const { medicineId, quantity } = item;
        const reqQty = parseInt(quantity, 10);

        if (isNaN(reqQty) || reqQty <= 0) {
          throw new Error("الكمية المطلوبة غير صالحة للدواء.");
        }

        const medicine = await tx.medicine.findFirst({
          where: {
            id: medicineId,
            OR: [{ pharmacyId: currentPharmacyId }, { isGlobal: true }],
          },
        });

        if (!medicine) {
          throw new Error("الدواء المحدد غير موجود بالمخزون لهذه الصيدلية.");
        }

        // a. Fetch all Batch records for medicine scoped to pharmacyId where quantity > 0, ordered by expiryDate ASC
        let batches = await tx.batch.findMany({
          where: { medicineId, pharmacyId: currentPharmacyId, quantity: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
        });

        // Fallback for legacy items: create initial batch if legacy stock exists but no Batch records
        const totalBatchQty = batches.reduce((sum, b) => sum + b.quantity, 0);
        if (batches.length === 0 && medicine.stock >= reqQty) {
          const initialBatch = await tx.batch.create({
            data: {
              medicineId: medicine.id,
              pharmacyId: currentPharmacyId,
              quantity: medicine.stock,
              expiryDate: medicine.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          });
          batches = [initialBatch];
        } else if (totalBatchQty < reqQty && medicine.stock < reqQty) {
          throw new Error(
            `المخزون غير كافٍ للدواء "${medicine.tradeName}". المتوفر: ${totalBatchQty || medicine.stock}، المطلوب: ${reqQty}`
          );
        }

        // b. FEFO Subtraction Loop: Deduct required quantity starting from oldest batch
        let remainingToDeduct = reqQty;

        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;

          if (batch.quantity >= remainingToDeduct) {
            const newQty = batch.quantity - remainingToDeduct;
            await tx.batch.update({
              where: { id: batch.id },
              data: { quantity: newQty },
            });
            remainingToDeduct = 0;
          } else {
            remainingToDeduct -= batch.quantity;
            await tx.batch.update({
              where: { id: batch.id },
              data: { quantity: 0 },
            });
          }
        }

        if (remainingToDeduct > 0) {
          throw new Error(
            `تعذر خصم كامل الكمية المطلوبة للدواء "${medicine.tradeName}" من الشحنات المتاحة.`
          );
        }

        // c. Update parent Medicine.totalStock and stock
        const totalRemaining = await tx.batch.aggregate({
          where: { medicineId: medicine.id, pharmacyId: currentPharmacyId },
          _sum: { quantity: true },
        });
        const updatedTotalStock = totalRemaining._sum.quantity || 0;

        const nextExpiringBatch = await tx.batch.findFirst({
          where: { medicineId: medicine.id, pharmacyId: currentPharmacyId, quantity: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
        });

        await tx.medicine.update({
          where: { id: medicine.id },
          data: {
            totalStock: updatedTotalStock,
            stock: updatedTotalStock,
            expiryDate: nextExpiringBatch ? nextExpiringBatch.expiryDate : medicine.expiryDate,
          },
        });

        const lineTotal = medicine.sellingPrice * reqQty;
        totalAmount += lineTotal;

        saleItemsToCreate.push({
          medicineId,
          quantity: reqQty,
          unitPrice: medicine.sellingPrice,
          pharmacyId: currentPharmacyId,
        });
      }

      // Generate invoice number sequentially per pharmacy
      const lastSale = await tx.sale.findFirst({
        where: { pharmacyId: currentPharmacyId, invoiceNumber: { startsWith: "INV-" } },
        orderBy: { createdAt: "desc" },
      });

      let nextNum = 1;
      if (lastSale && lastSale.invoiceNumber) {
        const match = lastSale.invoiceNumber.match(/\d+/);
        if (match) nextNum = parseInt(match[0], 10) + 1;
      }

      let invoiceNumber = `INV-${String(nextNum).padStart(6, "0")}`;
      let exists = await tx.sale.findUnique({ where: { invoiceNumber } });
      while (exists) {
        nextNum += 1;
        invoiceNumber = `INV-${String(nextNum).padStart(6, "0")}`;
        exists = await tx.sale.findUnique({ where: { invoiceNumber } });
      }

      // Record checkout sale transaction
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          totalAmount,
          paymentMethod,
          userId: activeUserId,
          pharmacyId: currentPharmacyId,
          items: {
            create: saleItemsToCreate,
          },
        },
        include: {
          items: {
            include: {
              medicine: {
                select: { tradeName: true, genericName: true, barcode: true },
              },
            },
          },
          user: { select: { username: true } },
        },
      });

      return sale;
    });

    return NextResponse.json({
      success: true,
      message: "تمت عملية البيع بأسلوب FEFO بنجاح.",
      data: result,
    });
  } catch (error: any) {
    console.error("[Sales FEFO Checkout API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "فشل في إتمام عملية البيع." },
      { status: 400 }
    );
  }
}
