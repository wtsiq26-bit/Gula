// ──────────────────────────────────────────────────────────────
// Gula PMS — Dashboard Controller (Phase 4)
// Aggregates analytics data: total sales, stock stats,
// low stock alerts, expiry alerts, and recent activity.
// ──────────────────────────────────────────────────────────────

const prisma = require("../config/db");

// ─── GET /api/dashboard/stats ────────────────────────────────
// Returns comprehensive dashboard statistics.
// ──────────────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const { pharmacyId } = req.user;
    const now = new Date();

    // Date ranges
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // Run all queries in parallel
    const [
      totalMedicines,
      totalStock,
      lowStockCount,
      expiringSoonCount,
      expiredCount,
      totalSalesToday,
      totalSalesMonth,
      salesTodayAmount,
      salesMonthAmount,
      totalSuppliers,
      recentSales,
      lowStockMedicines,
      expiringMedicines,
    ] = await Promise.all([
      // Total medicine types
      prisma.medicine.count({ where: { pharmacyId } }),

      // Total stock units
      prisma.medicine.aggregate({ where: { pharmacyId }, _sum: { stock: true } }),

      // Low stock (≤ 10 units)
      prisma.medicine.count({ where: { pharmacyId, stock: { lte: 10 } } }),

      // Expiring within 30 days (but not yet expired)
      prisma.medicine.count({
        where: {
          pharmacyId,
          expiryDate: { lte: thirtyDaysFromNow, gt: now },
        },
      }),

      // Already expired
      prisma.medicine.count({
        where: { pharmacyId, expiryDate: { lte: now } },
      }),

      // Today's sale count
      prisma.sale.count({ where: { pharmacyId, createdAt: { gte: todayStart } } }),

      // This month's sale count
      prisma.sale.count({ where: { pharmacyId, createdAt: { gte: monthStart } } }),

      // Today's revenue
      prisma.sale.aggregate({
        where: { pharmacyId, createdAt: { gte: todayStart } },
        _sum: { totalAmount: true },
      }),

      // Monthly revenue
      prisma.sale.aggregate({
        where: { pharmacyId, createdAt: { gte: monthStart } },
        _sum: { totalAmount: true },
      }),

      // Total suppliers
      prisma.supplier.count({ where: { pharmacyId } }),

      // Recent 5 sales
      prisma.sale.findMany({
        where: { pharmacyId },
        include: {
          user: { select: { username: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Top low-stock medicines
      prisma.medicine.findMany({
        where: { pharmacyId, stock: { lte: 10 } },
        select: { id: true, tradeName: true, stock: true, sellingPrice: true },
        orderBy: { stock: "asc" },
        take: 10,
      }),

      // Expiring medicines
      prisma.medicine.findMany({
        where: {
          pharmacyId,
          expiryDate: { lte: thirtyDaysFromNow, gt: now },
        },
        select: { id: true, tradeName: true, expiryDate: true, stock: true },
        orderBy: { expiryDate: "asc" },
        take: 10,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalMedicines,
          totalStock: totalStock._sum.stock || 0,
          lowStockCount,
          expiringSoonCount,
          expiredCount,
          totalSuppliers,
        },
        sales: {
          todayCount: totalSalesToday,
          monthCount: totalSalesMonth,
          todayRevenue: salesTodayAmount._sum.totalAmount || 0,
          monthRevenue: salesMonthAmount._sum.totalAmount || 0,
        },
        recentSales,
        alerts: {
          lowStock: lowStockMedicines,
          expiring: expiringMedicines,
        },
      },
    });
  } catch (error) {
    console.error("[Dashboard] Stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard stats." });
  }
};

module.exports = { getDashboardStats };
