"use client";

import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/formatCurrency";
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  CalendarDays, 
  FileDown, 
  Receipt, 
  RefreshCw
} from "lucide-react";
import { useReactToPrint } from "react-to-print";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    todaySales: 0,
    todayProfit: 0,
    monthSales: 0,
    monthProfit: 0,
    recentSales: [],
  });

  const printRef = useRef<HTMLDivElement>(null);
  const [pharmacyInfo, setPharmacyInfo] = useState<{ name: string; location: string }>({ name: "", location: "" });

  useEffect(() => {
    let savedPharmacy: any = {};
    let savedUser: any = {};
    try {
      const rawP = localStorage.getItem("gula_pharmacy");
      if (rawP && rawP !== "undefined") savedPharmacy = JSON.parse(rawP);
      const rawU = localStorage.getItem("gula_user");
      if (rawU && rawU !== "undefined") savedUser = JSON.parse(rawU);
    } catch (e) {}
    setPharmacyInfo({
      name: savedPharmacy.name || savedUser.name || "Gula",
      location: savedPharmacy.location || savedUser.location || "",
    });
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Gula_Report",
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res: any = await api.get("/reports");
      const reportData = res?.data || res;
      if (reportData) {
        setData({
          todaySales: reportData.todaySales || 0,
          todayProfit: reportData.todayProfit || 0,
          monthSales: reportData.monthSales || 0,
          monthProfit: reportData.monthProfit || 0,
          recentSales: reportData.recentSales || [],
        });
      }
    } catch (err: any) {
      toast.error(err.message || "فشل تحميل تقارير الأرباح والمبيعات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      
      {/* ─── Header & Action Buttons ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            تقارير الأرباح والمبيعات
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            ملخص مالي شامل لمبيعات وصافي أرباح اليوم والشهر الحالي بالنقد العراقي (د.ع)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchReports} 
            disabled={loading}
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => handlePrint()}
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition-all disabled:opacity-50"
          >
            <FileDown className="w-5 h-5" />
            تصدير التقرير (PDF)
          </button>
        </div>
      </div>

      {/* ─── Dashboard Content (Screen) ─── */}
      <div className="space-y-6 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Today's Sales */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">مبيعات اليوم</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-2" dir="ltr">
                  {formatCurrency(data.todaySales)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-400 flex justify-between">
              <span>تاريخ اليوم</span>
              <span>{new Date().toLocaleDateString("ar-IQ")}</span>
            </div>
          </div>

          {/* Today's Net Profit */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">أرباح اليوم (صافي)</p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2" dir="ltr">
                  {formatCurrency(data.todayProfit)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-400 flex justify-between">
              <span>نسبة الأرباح اليومية</span>
              <span className="font-bold text-emerald-600">
                {data.todaySales > 0 ? `${Math.round((data.todayProfit / data.todaySales) * 100)}%` : "0%"}
              </span>
            </div>
          </div>

          {/* Month's Sales */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">مبيعات الشهر الحالي</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-2" dir="ltr">
                  {formatCurrency(data.monthSales)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <CalendarDays className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-400 flex justify-between">
              <span>الشهر والسنـة</span>
              <span>{new Date().toLocaleString("ar-IQ", { month: "long", year: "numeric" })}</span>
            </div>
          </div>

          {/* Month's Net Profit */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">أرباح الشهر (صافي)</p>
                <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-2" dir="ltr">
                  {formatCurrency(data.monthProfit)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-400 flex justify-between">
              <span>إجمالي هامش الربح</span>
              <span className="font-bold text-indigo-600">
                {data.monthSales > 0 ? `${Math.round((data.monthProfit / data.monthSales) * 100)}%` : "0%"}
              </span>
            </div>
          </div>

        </div>

        {/* ─── Recent Sales / Transactions Table ─── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              أحدث العمليات والمبيعات المسجلة
            </h2>
            <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-full font-bold">
              {data.recentSales.length} عملية
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right text-slate-600 dark:text-slate-300">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-semibold text-start">رقم الفاتورة</th>
                  <th className="px-6 py-4 font-semibold text-start">التاريخ والوقت</th>
                  <th className="px-6 py-4 font-semibold text-start">الكاشير</th>
                  <th className="px-6 py-4 font-semibold text-center">طريقة الدفع</th>
                  <th className="px-6 py-4 font-semibold text-end">المبلغ الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {data.recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      لا توجد عمليات مبيعات مسجلة لهذا الشهر حتى الآن.
                    </td>
                  </tr>
                ) : (
                  data.recentSales.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                        {sale.invoiceNumber || sale.invoiceNo || sale.id}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(sale.createdAt).toLocaleString("ar-IQ")}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                        {sale.user?.username || "مدير النظام"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400">
                          {sale.paymentMethod === "CASH" ? "نقداً" : sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-end font-mono font-extrabold text-emerald-600 dark:text-emerald-400" dir="ltr">
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

      {/* ─── Visually Hidden Formal A4 Report for react-to-print ─── */}
      <div className="hidden">
        <div 
          ref={printRef} 
          className="p-8 bg-white text-slate-900 font-sans text-right text-sm w-[210mm] min-h-[297mm] mx-auto box-border" 
          dir="rtl"
        >
          
          {/* Official Document Header */}
          <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 mb-1">
                تقرير مبيعات وأرباح {pharmacyInfo.name ? `صيدلية ${pharmacyInfo.name}` : "الصيدلية"}
              </h1>
              <p className="text-xs text-slate-500">
                تقرير مالي رسمي معتمد لإدارة الصيدلية وقسم المحاسبة {pharmacyInfo.location ? `(${pharmacyInfo.location})` : ""}
              </p>
            </div>
            <div className="text-left font-mono text-xs text-slate-600">
              <div>تاريخ التقرير: {new Date().toLocaleDateString("ar-IQ")}</div>
              <div>الوقت: {new Date().toLocaleTimeString("ar-IQ")}</div>
              <div className="font-bold text-emerald-700 mt-1">Gula PMS v1.0</div>
            </div>
          </div>

          {/* Financial Summary Table */}
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900 mb-3 border-r-4 border-emerald-600 pr-2">
              الملخص المالي الرئيسي (بالدينار العراقي)
            </h2>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-700 text-center">
                  <th className="border border-slate-300 p-2.5">مبيعات اليوم</th>
                  <th className="border border-slate-300 p-2.5 text-emerald-700">أرباح اليوم (صافي)</th>
                  <th className="border border-slate-300 p-2.5">مبيعات الشهر الحالي</th>
                  <th className="border border-slate-300 p-2.5 text-indigo-700">أرباح الشهر (صافي)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-center font-mono font-bold text-sm">
                  <td className="border border-slate-300 p-3">{formatCurrency(data.todaySales)}</td>
                  <td className="border border-slate-300 p-3 text-emerald-600 bg-emerald-50/50">{formatCurrency(data.todayProfit)}</td>
                  <td className="border border-slate-300 p-3">{formatCurrency(data.monthSales)}</td>
                  <td className="border border-slate-300 p-3 text-indigo-600 bg-indigo-50/50">{formatCurrency(data.monthProfit)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Transactions Table */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3 border-r-4 border-emerald-600 pr-2">
              جدول أحدث العمليات والمبيعات المسجلة
            </h2>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th className="border border-slate-300 p-2 text-right">رقم الفاتورة</th>
                  <th className="border border-slate-300 p-2 text-right">التاريخ والوقت</th>
                  <th className="border border-slate-300 p-2 text-right">الكاشير</th>
                  <th className="border border-slate-300 p-2 text-center">طريقة الدفع</th>
                  <th className="border border-slate-300 p-2 text-left">المبلغ الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.recentSales && data.recentSales.length > 0 ? (
                  data.recentSales.map((sale: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="border border-slate-300 p-2 font-mono font-bold">{sale.invoiceNumber || sale.invoiceNo || sale.id}</td>
                      <td className="border border-slate-300 p-2">{new Date(sale.createdAt).toLocaleString("ar-IQ")}</td>
                      <td className="border border-slate-300 p-2 font-semibold">{sale.user?.username || "مدير النظام"}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">{sale.paymentMethod === "CASH" ? "نقداً" : sale.paymentMethod}</td>
                      <td className="border border-slate-300 p-2 text-left font-mono font-bold" dir="ltr">{formatCurrency(sale.totalAmount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="border border-slate-300 p-4 text-center text-slate-500">
                      لا توجد عمليات مبيعات مسجلة لهذا الشهر.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Official Document Footer */}
          <div className="mt-12 pt-6 border-t border-slate-300 flex justify-between text-xs text-slate-600">
            <div>
              <div className="font-bold mb-1">توقيع المسؤول / الصيدلاني:</div>
              <div className="w-48 border-b border-dashed border-slate-400 mt-6"></div>
            </div>
            <div className="text-left font-mono">
              <div>صفحة 1 من 1</div>
              <div className="text-[10px] text-slate-400 mt-1">تم الإنشاء بواسطة نظام Gula PMS</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
