"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Bell, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Search, 
  CheckCircle2, 
  RefreshCw,
  PackageCheck,
  ShieldAlert
} from "lucide-react";
import SkeletonTable from "@/components/SkeletonTable";

export default function ExpiryAlertsPage() {
  const [alertsData, setAlertsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "EXPIRED" | "90DAYS" | "180DAYS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/alerts/expiry");
      setAlertsData(res.data || res);
    } catch (err) {
      console.error("[Expiry Alerts Fetch Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const summary = alertsData?.summary || {
    expiredCount: 0,
    within90DaysCount: 0,
    within180DaysCount: 0,
    totalAlertsCount: 0,
  };

  const expiredList = alertsData?.data?.expired || [];
  const within90List = alertsData?.data?.within90Days || [];
  const within180List = alertsData?.data?.within180Days || [];

  // Determine list based on active tab
  let currentList: any[] = [];
  if (activeTab === "EXPIRED") {
    currentList = expiredList;
  } else if (activeTab === "90DAYS") {
    currentList = within90List;
  } else if (activeTab === "180DAYS") {
    currentList = within180List;
  } else {
    currentList = [...expiredList, ...within90List, ...within180List];
  }

  // Filter search query
  const filteredBatches = currentList.filter((batch: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const tradeName = (batch.medicine?.tradeName || "").toLowerCase();
    const genericName = (batch.medicine?.genericName || "").toLowerCase();
    const barcode = (batch.medicine?.barcode || "").toLowerCase();
    return tradeName.includes(q) || genericName.includes(q) || barcode.includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-7 h-7 text-rose-600" />
            تنبيهات الصلاحية والشحنات (FEFO)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مراقبة وإدارة شحنات الأدوية المنتهية والصلاحية الحرجة والتحذيرية
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          تحديث البيانات
        </button>
      </div>

      {/* ── Summary KPI Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expired Card */}
        <div 
          onClick={() => setActiveTab("EXPIRED")}
          className={`cursor-pointer rounded-xl border p-5 transition-all ${
            activeTab === "EXPIRED" 
              ? "ring-2 ring-rose-500 bg-rose-50/80 dark:bg-rose-900/30 border-rose-300" 
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <span className="text-3xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {summary.expiredCount}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mt-3">منتهي الصلاحية</h3>
          <p className="text-xs text-slate-500 mt-0.5">يتوجب سحبها فوراً من الرفوف</p>
        </div>

        {/* Critical (90 Days) Card */}
        <div 
          onClick={() => setActiveTab("90DAYS")}
          className={`cursor-pointer rounded-xl border p-5 transition-all ${
            activeTab === "90DAYS" 
              ? "ring-2 ring-amber-500 bg-amber-50/80 dark:bg-amber-900/30 border-amber-300" 
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-3xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {summary.within90DaysCount}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mt-3">حرج (أقل من 90 يوماً)</h3>
          <p className="text-xs text-slate-500 mt-0.5">تطلب أولوية بيع بأسلوب FEFO</p>
        </div>

        {/* Warning (180 Days) Card */}
        <div 
          onClick={() => setActiveTab("180DAYS")}
          className={`cursor-pointer rounded-xl border p-5 transition-all ${
            activeTab === "180DAYS" 
              ? "ring-2 ring-yellow-500 bg-yellow-50/80 dark:bg-yellow-900/30 border-yellow-300" 
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-yellow-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-3xl font-bold font-mono text-yellow-600 dark:text-yellow-400">
              {summary.within180DaysCount}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mt-3">تحذير (أقل من 180 يوماً)</h3>
          <p className="text-xs text-slate-500 mt-0.5">متابعة الحركة والمخزون</p>
        </div>

        {/* Total Alerts Card */}
        <div 
          onClick={() => setActiveTab("ALL")}
          className={`cursor-pointer rounded-xl border p-5 transition-all ${
            activeTab === "ALL" 
              ? "ring-2 ring-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/30 border-emerald-300" 
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <span className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {summary.totalAlertsCount}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mt-3">إجمالي تنبيهات الشحنات</h3>
          <p className="text-xs text-slate-500 mt-0.5">كل الشحنات المسجلة في التنبيهات</p>
        </div>
      </div>

      {/* ── Table Controls & Search ─────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === "ALL"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            الكل ({summary.totalAlertsCount})
          </button>
          <button
            onClick={() => setActiveTab("EXPIRED")}
            className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === "EXPIRED"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            }`}
          >
            منتهي الصلاحية ({summary.expiredCount})
          </button>
          <button
            onClick={() => setActiveTab("90DAYS")}
            className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === "90DAYS"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            }`}
          >
            حرج 90 يوم ({summary.within90DaysCount})
          </button>
          <button
            onClick={() => setActiveTab("180DAYS")}
            className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === "180DAYS"
                ? "bg-yellow-500 text-white shadow-sm"
                : "text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
            }`}
          >
            تحذير 180 يوم ({summary.within180DaysCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الدواء أو الباركود..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* ── Main Data Table ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} columns={6} />
        ) : filteredBatches.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                لا توجد شحنات مطابقة للتنبيه المحدد
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                جميع الشحنات ضمن النطاق المختار في حالة سليمة ومستقرة.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-start">اسم الدواء</th>
                  <th className="px-6 py-4 font-semibold text-start">الباركود</th>
                  <th className="px-6 py-4 font-semibold text-start">التصنيف</th>
                  <th className="px-6 py-4 font-semibold text-center">كمية الشحنة</th>
                  <th className="px-6 py-4 font-semibold text-start">تاريخ الانتهاء</th>
                  <th className="px-6 py-4 font-semibold text-center">الحالة والتوقيت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {filteredBatches.map((batch: any) => {
                  const expDate = new Date(batch.expiryDate);
                  const now = new Date();
                  const isExpired = expDate < now;
                  const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                  let statusBadge;
                  if (isExpired) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                        <XCircle className="w-3.5 h-3.5" />
                        منتهي الصلاحية
                      </span>
                    );
                  } else if (daysLeft <= 90) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        ينتهي خلال {daysLeft} يوم (حرج)
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <Clock className="w-3.5 h-3.5" />
                        ينتهي خلال {daysLeft} يوم (تحذير)
                      </span>
                    );
                  }

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 text-start font-medium text-slate-900 dark:text-white">
                        {batch.medicine?.tradeName || "دواء غير مسمى"}
                        {batch.medicine?.genericName && (
                          <span className="block text-xs text-slate-400 font-normal">
                            {batch.medicine.genericName}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-start font-mono text-xs text-slate-500">
                        {batch.medicine?.barcode || "—"}
                      </td>
                      <td className="px-6 py-4 text-start text-xs text-slate-500">
                        {batch.medicine?.category || "عام"}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {batch.quantity}
                      </td>
                      <td className="px-6 py-4 text-start font-mono text-xs text-slate-600 dark:text-slate-300" dir="ltr">
                        {expDate.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {statusBadge}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
