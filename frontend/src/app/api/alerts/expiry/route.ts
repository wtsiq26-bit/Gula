// Gula PMS - Expiry Alerts API Route Handler
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    
    // 90 days threshold
    const in90Days = new Date(now);
    in90Days.setDate(in90Days.getDate() + 90);

    // 180 days threshold
    const in180Days = new Date(now);
    in180Days.setDate(in180Days.getDate() + 180);

    // Fetch batches with quantity > 0 up to 180 days threshold or already expired
    const batches = await prisma.batch.findMany({
      where: {
        quantity: { gt: 0 },
        expiryDate: { lte: in180Days },
      },
      include: {
        medicine: {
          select: {
            id: true,
            tradeName: true,
            genericName: true,
            scientificName: true,
            barcode: true,
            category: true,
            sellingPrice: true,
          },
        },
      },
      orderBy: { expiryDate: "asc" },
    });

    // Categorize into expired, within 90 days, and within 180 days
    const expired: typeof batches = [];
    const within90Days: typeof batches = [];
    const within180Days: typeof batches = [];

    for (const batch of batches) {
      const exp = new Date(batch.expiryDate);
      if (exp < now) {
        expired.push(batch);
      } else if (exp <= in90Days) {
        within90Days.push(batch);
      } else {
        within180Days.push(batch);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: {
        expiredCount: expired.length,
        within90DaysCount: within90Days.length,
        within180DaysCount: within180Days.length,
        totalAlertsCount: batches.length,
      },
      data: {
        expired,
        within90Days,
        within180Days,
      },
    });
  } catch (error: any) {
    console.error("[Expiry Alerts API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ أثناء فحص تنبيهات الصلاحية." },
      { status: 500 }
    );
  }
}
