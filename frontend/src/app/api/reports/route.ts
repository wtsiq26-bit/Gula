// Gula PMS - Multi-Tenant Reports API Route Handler
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/getAuthSession";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session?.pharmacyId) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }
    const currentPharmacyId = session.pharmacyId;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todaySales, monthSales] = await Promise.all([
      prisma.sale.findMany({
        where: {
          pharmacyId: currentPharmacyId,
          createdAt: { gte: todayStart },
        },
        include: {
          user: { select: { username: true } },
          items: {
            include: {
              medicine: { select: { tradeName: true, costPrice: true, sellingPrice: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sale.findMany({
        where: {
          pharmacyId: currentPharmacyId,
          createdAt: { gte: monthStart },
        },
        include: {
          user: { select: { username: true } },
          items: {
            include: {
              medicine: { select: { tradeName: true, costPrice: true, sellingPrice: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const calculateMetrics = (salesList: any[]) => {
      let totalSales = 0;
      let netProfit = 0;

      for (const sale of salesList) {
        totalSales += sale.totalAmount;
        for (const item of sale.items) {
          const costPrice = item.medicine?.costPrice || 0;
          const profitPerItem = (item.unitPrice - costPrice) * item.quantity;
          netProfit += profitPerItem;
        }
      }
      return { totalSales, netProfit };
    };

    const todayMetrics = calculateMetrics(todaySales);
    const monthMetrics = calculateMetrics(monthSales);

    return NextResponse.json({
      success: true,
      data: {
        todaySales: todayMetrics.totalSales,
        todayProfit: todayMetrics.netProfit,
        monthSales: monthMetrics.totalSales,
        monthProfit: monthMetrics.netProfit,
        recentSales: monthSales.slice(0, 15),
      },
    });
  } catch (error: any) {
    console.error("[Next.js Reports API Error]:", error);
    return NextResponse.json({ error: error.message || "حدث خطأ أثناء تحميل التقرير" }, { status: 500 });
  }
}
