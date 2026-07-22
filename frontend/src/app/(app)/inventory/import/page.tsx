"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function ImportMedicinesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null); // Reset result on new file selection
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("الرجاء اختيار ملف أولاً");
      return;
    }

    setLoading(true);
    setResult(null);

    let user: any = {};
    try {
      const rawUser = localStorage.getItem("gula_user");
      if (rawUser && rawUser !== "undefined") user = JSON.parse(rawUser);
    } catch (e) {}
    const token = localStorage.getItem("gula_token");

    const formData = new FormData();
    formData.append("file", file);
    if (user.pharmacyId) {
      formData.append("pharmacyId", user.pharmacyId);
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch("/api/medicines/import", {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || data.message || "فشل معالجة استيراد الأدوية");
      }

      setResult({
        success: true,
        message: data.message || "تم الاستيراد بنجاح",
        count: data.count,
      });
      toast.success(`تم استيراد ${data.count} دواء بنجاح!`);
      setFile(null); // clear file after success
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || "فشل استيراد الملف. تأكد من صحة التنسيق.",
      });
      toast.error(err.message || "فشل الاستيراد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
          استيراد الأدوية (Excel)
        </h1>
        <p className="text-slate-500 mt-2">
          قم برفع القائمة الرسمية للأدوية المسجلة (بصيغة .xlsx). سيتم استيراد الأدوية وتجاهل الرموز الشريطية (الباركود) ليتم إضافتها لاحقاً من قبل الصيدلاني عند جرد المخزون.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
        
        {/* Upload Area */}
        <div 
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors ${
            file ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500"
          }`}
        >
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
            id="excel-upload"
          />
          <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
            <div className={`p-4 rounded-full mb-4 ${file ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
              <Upload className="w-8 h-8" />
            </div>
            {file ? (
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{file.name}</p>
                <p className="text-sm text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">اضغط لاختيار ملف أو اسحب الملف هنا</p>
                <p className="text-sm text-slate-500 mt-1">يدعم فقط ملفات Excel (.xlsx)</p>
              </div>
            )}
          </label>
        </div>

        {/* Action Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="btn-primary w-full sm:w-auto px-8 py-3 text-lg flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري الاستيراد... قد يستغرق هذا بعض الوقت
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-5 h-5" />
                بدء استيراد البيانات
              </>
            )}
          </button>
        </div>

        {/* Result States */}
        {result && (
          <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${result.success ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800" : "bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200 border border-rose-200 dark:border-rose-800"}`}>
            {result.success ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
            <div>
              <h4 className="font-semibold">{result.success ? "نجاح" : "خطأ"}</h4>
              <p className="text-sm mt-1">{result.message}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
