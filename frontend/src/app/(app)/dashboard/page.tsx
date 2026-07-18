"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  DollarSign, 
  Calendar, 
  Box, 
  Users, 
  AlertTriangle, 
  Clock, 
  XCircle,
  TrendingUp,
  Receipt
} from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get("/dashboard/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <div className="spinner border-emerald-600 w-12 h-12" />
      </div>
    );
  }

  const { overview, sales, recentSales } = stats || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          لوحة التحكم
        </h1>
        <p className="text-sm text-slate-500 mt-1">نظرة عامة على عمليات ونشاطات صيدليتك</p>
      </div>

      {/* ── KPI Cards Row 1: Sales ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="أرباح اليوم"
          value={formatCurrency(sales?.todayRevenue || 0)}
          subtitle={`${sales?.todayCount || 0} عمليات بيع اليوم`}
          icon={<DollarSign className="w-6 h-6" />}
          color="emerald"
        />
        <KPICard
          title="أرباح الشهر"
          value={formatCurrency(sales?.monthRevenue || 0)}
          subtitle={`${sales?.monthCount || 0} مبيعات هذا الشهر`}
          icon={<Calendar className="w-6 h-6" />}
          color="blue"
        />
        <KPICard
          title="إجمالي المخزون"
          value={overview?.totalStock?.toLocaleString() || "0"}
          subtitle={`${overview?.totalMedicines || 0} أنواع أدوية`}
          icon={<Box className="w-6 h-6" />}
          color="indigo"
        />
        <KPICard
          title="الموردين"
          value={overview?.totalSuppliers || 0}
          subtitle="مورد نشط"
          icon={<Users className="w-6 h-6" />}
          color="slate"
        />
      </div>

      {/* ── Alert Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AlertCard
          title="مخزون منخفض"
          count={overview?.lowStockCount || 0}
          color="amber"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <AlertCard
          title="يشارف على الانتهاء"
          count={overview?.expiringSoonCount || 0}
          color="rose"
          icon={<Clock className="w-5 h-5" />}
        />
        <AlertCard
          title="منتهي الصلاحية"
          count={overview?.expiredCount || 0}
          color="red"
          icon={<XCircle className="w-5 h-5" />}
        />
      </div>

      {/* ── Recent Sales Table ────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            أحدث عمليات البيع
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 font-semibold text-start">الفاتورة</th>
                <th className="px-6 py-4 font-semibold text-start">التاريخ</th>
                <th className="px-6 py-4 font-semibold text-start">المواد</th>
                <th className="px-6 py-4 font-semibold text-end">المجموع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {(!recentSales || recentSales.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    لا توجد مبيعات حديثة.
                  </td>
                </tr>
              ) : (
                recentSales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-white text-start">
                      {sale.invoiceNo}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-start" dir="ltr">
                      {new Date(sale.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-start">
                      {sale.items?.length || 0} مواد
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-end" dir="ltr">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────

function KPICard({ title, value, subtitle, icon, color }: any) {
  const colorStyles: any = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${colorStyles[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono" dir="ltr">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function AlertCard({ title, count, color, icon }: any) {
  const isZero = count === 0;
  
  const styles: any = {
    amber: isZero ? "border-slate-200 text-slate-400 dark:border-slate-700" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400",
    rose: isZero ? "border-slate-200 text-slate-400 dark:border-slate-700" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-400",
    red: isZero ? "border-slate-200 text-slate-400 dark:border-slate-700" : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className={`rounded-xl border p-4 flex justify-between items-center transition-colors ${styles[color]}`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-semibold">{title}</span>
      </div>
      <span className="text-2xl font-bold font-mono">{count}</span>
    </div>
  );
}
