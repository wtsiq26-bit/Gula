// Gula PMS - Multi-Tenant Medicines API Route Handler (GET with Global Catalog Fallback & POST)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/getAuthSession";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session?.pharmacyId) {
      return NextResponse.json({ success: false, message: "غير مصرح بالوصول." }, { status: 401 });
    }
    const currentPharmacyId = session.pharmacyId;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const lowStock = searchParams.get("lowStock");

    // Global Catalog Fallback: fetch medicines belonging to current pharmacy OR marked as global catalog entries
    const where: any = {
      OR: [
        { pharmacyId: currentPharmacyId },
        { isGlobal: true },
      ],
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { tradeName: { contains: search } },
            { genericName: { contains: search } },
            { scientificName: { contains: search } },
            { barcode: { contains: search } },
          ],
        },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (lowStock === "true") {
      where.stock = { lte: 10 };
    }

    const medicines = await prisma.medicine.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: medicines });
  } catch (error: any) {
    console.error("[Medicines API GET Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ أثناء جلب قائمة الأدوية." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session?.pharmacyId) {
      return NextResponse.json({ success: false, message: "غير مصرح بالإجراء." }, { status: 401 });
    }
    const currentPharmacyId = session.pharmacyId;

    const body = await request.json();
    const { tradeName, genericName, category, barcode, costPrice, sellingPrice, stock, expiryDate, supplierId } = body;

    if (!tradeName) {
      return NextResponse.json({ success: false, message: "اسم الدواء مطلوب." }, { status: 400 });
    }

    if (barcode) {
      const existing = await prisma.medicine.findFirst({
        where: { barcode, pharmacyId: currentPharmacyId },
      });
      if (existing) {
        return NextResponse.json({ success: false, message: "يوجد دواء آخر بهذا الباركود مسجل في هذه الصيدلية." }, { status: 409 });
      }
    }

    const parsedStock = parseInt(stock, 10) || 0;

    const medicine = await prisma.medicine.create({
      data: {
        tradeName,
        genericName: genericName || null,
        category: category || null,
        barcode: barcode || null,
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        stock: parsedStock,
        totalStock: parsedStock,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        supplierId: supplierId || null,
        pharmacyId: currentPharmacyId,
        isGlobal: false,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    return NextResponse.json(
      { success: true, message: "تمت إضافة الدواء بنجاح.", data: medicine },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Medicines API POST Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ أثناء إضافة الدواء." },
      { status: 500 }
    );
  }
}
