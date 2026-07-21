// Gula PMS - Medicine Stock Link & Batch Intake Route Handler (FEFO)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { medicineId, barcode, quantity, expiryDate } = body;

    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return NextResponse.json(
        { success: false, message: "يرجى تحديد كمية صالحة أكبر من الصفر." },
        { status: 400 }
      );
    }

    if (!expiryDate) {
      return NextResponse.json(
        { success: false, message: "تاريخ الصلاحية مطلوب لإضافة الشحنة (Batch)." },
        { status: 400 }
      );
    }

    const parsedExpiry = new Date(expiryDate);
    if (isNaN(parsedExpiry.getTime())) {
      return NextResponse.json(
        { success: false, message: "تاريخ الصلاحية غير صالح." },
        { status: 400 }
      );
    }

    // Resolve medicine by ID or barcode
    let medicine = null;
    if (medicineId) {
      medicine = await prisma.medicine.findUnique({ where: { id: medicineId } });
    } else if (barcode) {
      medicine = await prisma.medicine.findUnique({ where: { barcode } });
    }

    if (!medicine) {
      return NextResponse.json(
        { success: false, message: "لم يتم العثور على الدواء المحدد." },
        { status: 404 }
      );
    }

    // Wrap batch creation and stock recalculation in a Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create a new Batch record
      const batch = await tx.batch.create({
        data: {
          medicineId: medicine.id,
          quantity: parsedQuantity,
          expiryDate: parsedExpiry,
        },
      });

      // 2. Aggregate all active batch quantities for this medicine
      const aggregation = await tx.batch.aggregate({
        where: { medicineId: medicine.id },
        _sum: { quantity: true },
      });

      const totalStock = aggregation._sum.quantity || 0;

      // 3. Find the earliest active batch expiry date to update Medicine.expiryDate
      const earliestBatch = await tx.batch.findFirst({
        where: { medicineId: medicine.id, quantity: { gt: 0 } },
        orderBy: { expiryDate: "asc" },
      });

      // 4. Update totalStock and stock cache on parent Medicine
      const updatedMedicine = await tx.medicine.update({
        where: { id: medicine.id },
        data: {
          totalStock,
          stock: totalStock,
          expiryDate: earliestBatch ? earliestBatch.expiryDate : parsedExpiry,
          barcode: barcode || medicine.barcode,
        },
      });

      return { batch, medicine: updatedMedicine };
    });

    return NextResponse.json({
      success: true,
      message: `تم إضافة شحنة جديدة بكمية ${parsedQuantity} بنجاح للوجبة.`,
      data: result,
    });
  } catch (error: any) {
    console.error("[Medicines Link API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ أثناء إضافة الشحنة المخزنية." },
      { status: 500 }
    );
  }
}
