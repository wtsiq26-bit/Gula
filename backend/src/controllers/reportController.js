// ──────────────────────────────────────────────────────────────
// Gula PMS — Reports Controller (Profit & Sales Metrics)
// Calculates today's & month's total sales, net profits, and recent sales.
// ──────────────────────────────────────────────────────────────

const prisma = require("../config/db");

const getReports = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todaySales, monthSales] = await Promise.all([
      prisma.sale.findMany({
        where: {
          pharmacyId,
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
          pharmacyId,
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

    const calculateMetrics = (salesList) => {
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

    return res.status(200).json({
      success: true,
      data: {
        todaySales: todayMetrics.totalSales,
        todayProfit: todayMetrics.netProfit,
        monthSales: monthMetrics.totalSales,
        monthProfit: monthMetrics.netProfit,
        recentSales: monthSales.slice(0, 15),
      },
    });
  } catch (error) {
    console.error("[Reports Controller Error]:", error);
    return res.status(500).json({ success: false, message: "فشل في تحميل تقارير الأرباح والمبيعات" });
  }
};

module.exports = { getReports };
