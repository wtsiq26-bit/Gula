"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import SkeletonTable from "@/components/SkeletonTable";
import ScientificNameAutocomplete from "@/components/ScientificNameAutocomplete";
import { Search, Plus, Edit, Trash, Image as ImageIcon, Box, AlertTriangle, AlertCircle, Camera, FileSpreadsheet } from "lucide-react";
import CameraScanner from "@/components/CameraScanner";
import { formatCurrency } from "@/lib/formatCurrency";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

// ─── Zod Schema ────────────────────────────────────────────
const medicineSchema = z.object({
  tradeName: z.string().min(1, "الاسم التجاري مطلوب"),
  genericName: z.string().optional(),
  category: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.string().optional(),
  sellingPrice: z.string().optional(),
  stock: z.string().optional(),
  expiryDate: z.string().optional(),
  supplierId: z.string().optional(),
});

export default function InventoryPage() {
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  
  // Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Inline Editing
  const [inlineEditCell, setInlineEditCell] = useState<{ id: string, field: string } | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState("");

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm({
    resolver: zodResolver(medicineSchema),
  });

  const fetchMedicines = useCallback(async () => {
    try {
      const res = await api.get(`/medicines?search=${search}&limit=200`);
      setMedicines(res.data);
    } catch (err: any) {
      toast.error(err.message || "فشل تحميل المخزون");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchMedicines();
    fetchSuppliers();
  }, [fetchMedicines]);

  useEffect(() => {
    const timer = setTimeout(() => fetchMedicines(), 300);
    return () => clearTimeout(timer);
  }, [search, fetchMedicines]);

  // ─── Semantic Row Styles ──────────────────────────────────
  const getRowStyle = (medicine: any) => {
    const today = new Date();
    const expiry = medicine.expiryDate ? new Date(medicine.expiryDate) : null;
    
    // Expired
    if (expiry && expiry < today) {
      return "bg-rose-50 dark:bg-rose-900/20 border-s-4 border-s-rose-500";
    }
    // Low Stock
    if (medicine.stock <= 5) {
      return "bg-amber-50 dark:bg-amber-900/20 border-s-4 border-s-amber-500";
    }
    return "bg-white dark:bg-slate-800 border-s-4 border-s-transparent";
  };

  // ─── Inline Editing ───────────────────────────────────────
  const startInlineEdit = (medicine: any, field: string) => {
    setInlineEditCell({ id: medicine.id, field });
    setInlineEditValue(String(medicine[field] || ""));
  };

  const saveInlineEdit = async (medicine: any) => {
    if (!inlineEditCell) return;
    const { field } = inlineEditCell;
    const newValue = inlineEditValue;
    
    if (String(medicine[field]) === newValue) {
      setInlineEditCell(null);
      return;
    }

    // Optimistic Update
    const prev = [...medicines];
    setMedicines(prev => prev.map((m: any) => m.id === medicine.id ? { ...m, [field]: parseFloat(newValue) || newValue } : m));
    setInlineEditCell(null);

    try {
      await api.put(`/medicines/${medicine.id}`, { [field]: newValue });
      toast.success("تم التحديث");
    } catch (err: any) {
      setMedicines(prev); // Revert
      toast.error("فشل التحديث");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, medicine: any) => {
    if (e.key === "Enter") {
      saveInlineEdit(medicine);
    } else if (e.key === "Escape") {
      setInlineEditCell(null);
    }
  };

  // ─── Modals ───────────────────────────────────────────────
  const openModal = (medicine: any = null) => {
    if (medicine) {
      setEditing(medicine);
      setImagePreview(medicine.imageUrl ? `${API_BASE}${medicine.imageUrl}` : null);
      reset({
        tradeName: medicine.tradeName,
        genericName: medicine.genericName || "",
        category: medicine.category || "",
        barcode: medicine.barcode || "",
        costPrice: medicine.costPrice?.toString() || "",
        sellingPrice: medicine.sellingPrice?.toString() || "",
        stock: medicine.stock?.toString() || "",
        expiryDate: medicine.expiryDate ? new Date(medicine.expiryDate).toISOString().split("T")[0] : "",
        supplierId: medicine.supplierId || "",
      });
    } else {
      setEditing(null);
      setImagePreview(null);
      reset({ tradeName: "", genericName: "", category: "", barcode: "", costPrice: "", sellingPrice: "", stock: "", expiryDate: "", supplierId: "" });
    }
    setImageFile(null);
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        // Ensure undefined or empty values are not sent as literal "undefined" strings
        const value = data[key];
        if (value !== undefined && value !== null) {
          if (key === "barcode" && typeof value === "string") {
            formData.append(key, value.trim());
          } else {
            formData.append(key, value);
          }
        }
      });
      
      if (imageFile) formData.append("image", imageFile);

      if (editing) {
        await api.put(`/medicines/${editing.id}`, formData);
        toast.success("تم تحديث المادة بنجاح");
      } else {
        await api.post("/medicines", formData);
        toast.success("تم إضافة المادة بنجاح");
      }
      setShowModal(false);
      fetchMedicines();
    } catch (err: any) {
      toast.error(err.message || "فشل الحفظ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    // Optimistic Delete
    const prev = [...medicines];
    setMedicines(prev => prev.filter((m: any) => m.id !== deleteTarget.id));
    setDeleteTarget(null);

    try {
      await api.delete(`/medicines/${deleteTarget.id}`);
      toast.success("تم الحذف بنجاح");
    } catch (err: any) {
      setMedicines(prev); // Revert
      toast.error(err.message || "فشل الحذف");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Box className="w-6 h-6 text-emerald-600" />
            المخزون
          </h1>
          <p className="text-sm text-slate-500 mt-1">{medicines.length} مادة مسجلة</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/inventory/import" 
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>استيراد الأدوية (Excel)</span>
          </Link>
          <button onClick={() => openModal()} className="btn-primary shadow-sm hover:shadow-md">
            <Plus className="w-4 h-4 me-2" /> إضافة مادة
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="ابحث في المخزون..."
          className="input-field ps-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Data Table */}
      {loading ? (
        <SkeletonTable columns={8} rows={6} />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden relative">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm text-start">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 shadow-sm backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 font-semibold text-start">الصورة</th>
                  <th className="px-6 py-4 font-semibold text-start">الاسم التجاري</th>
                  <th className="px-6 py-4 font-semibold text-start">الباركود</th>
                  <th className="px-6 py-4 font-semibold text-end">التكلفة</th>
                  <th className="px-6 py-4 font-semibold text-end">سعر البيع</th>
                  <th className="px-6 py-4 font-semibold text-center">المخزون</th>
                  <th className="px-6 py-4 font-semibold text-start">الصلاحية</th>
                  <th className="px-6 py-4 font-semibold text-end">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {medicines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      لا توجد مواد مسجلة.
                    </td>
                  </tr>
                ) : (
                  medicines.map((medicine: any) => (
                    <tr key={medicine.id} className={`${getRowStyle(medicine)} hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group`}>
                      <td className="px-6 py-2">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                          {medicine.imageUrl ? (
                            <img src={`${API_BASE}${medicine.imageUrl}`} alt="Medicine" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-start font-semibold text-slate-900 dark:text-white">
                        {medicine.tradeName}
                        <div className="text-xs text-slate-500 font-normal">{medicine.genericName}</div>
                      </td>
                      <td className="px-6 py-4 text-start text-slate-500 font-mono text-xs">{medicine.barcode || "-"}</td>
                      
                      {/* Inline Editable Cost Price */}
                      <td className="px-6 py-4 text-end font-mono" onDoubleClick={() => startInlineEdit(medicine, "costPrice")}>
                        {inlineEditCell?.id === medicine.id && inlineEditCell?.field === "costPrice" ? (
                          <input 
                            autoFocus
                            type="number" 
                            className="w-20 px-2 py-1 text-end border border-emerald-500 rounded bg-white dark:bg-slate-900"
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onBlur={() => saveInlineEdit(medicine)}
                            onKeyDown={(e) => handleKeyDown(e, medicine)}
                          />
                        ) : (
                          <span className="cursor-pointer border-b border-dashed border-transparent hover:border-slate-400">{formatCurrency(medicine.costPrice)}</span>
                        )}
                      </td>

                      {/* Inline Editable Selling Price */}
                      <td className="px-6 py-4 text-end font-mono text-emerald-600 dark:text-emerald-400 font-bold" onDoubleClick={() => startInlineEdit(medicine, "sellingPrice")}>
                        {inlineEditCell?.id === medicine.id && inlineEditCell?.field === "sellingPrice" ? (
                          <input 
                            autoFocus
                            type="number" 
                            className="w-20 px-2 py-1 text-end border border-emerald-500 rounded bg-white dark:bg-slate-900"
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onBlur={() => saveInlineEdit(medicine)}
                            onKeyDown={(e) => handleKeyDown(e, medicine)}
                          />
                        ) : (
                          <span className="cursor-pointer border-b border-dashed border-transparent hover:border-emerald-400">{formatCurrency(medicine.sellingPrice)}</span>
                        )}
                      </td>

                      {/* Inline Editable Stock */}
                      <td className="px-6 py-4 text-center" onDoubleClick={() => startInlineEdit(medicine, "stock")}>
                         {inlineEditCell?.id === medicine.id && inlineEditCell?.field === "stock" ? (
                          <input 
                            autoFocus
                            type="number" 
                            className="w-16 px-2 py-1 text-center border border-emerald-500 rounded bg-white dark:bg-slate-900"
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onBlur={() => saveInlineEdit(medicine)}
                            onKeyDown={(e) => handleKeyDown(e, medicine)}
                          />
                        ) : (
                          <span className={`cursor-pointer inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold border-b border-dashed border-transparent hover:border-slate-400 ${medicine.stock <= 5 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400"}`}>
                            {medicine.stock || "0"}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-start text-slate-500">
                        {medicine.expiryDate ? new Date(medicine.expiryDate).toLocaleDateString("en-GB") : "-"}
                      </td>
                      
                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openModal(medicine)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(medicine)} className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-500 hover:text-rose-500 transition-colors">
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl m-4 flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Box className="w-5 h-5 text-emerald-600" />
                {editing ? "تعديل المادة" : "إضافة مادة جديدة"}
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="medicine-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Image Upload Area */}
                <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/30 hover:border-emerald-500 transition-colors">
                  <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <span className="text-xs text-white font-bold">تغيير الصورة</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }} />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Details */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-emerald-600 border-b border-slate-200 dark:border-slate-700 pb-2">التفاصيل الأساسية</h3>
                    <div>
                      <label className="input-label">الاسم التجاري *</label>
                      <input className={`input-field ${errors.tradeName ? "input-error" : ""}`} {...register("tradeName")} autoFocus />
                      {errors.tradeName && <p className="field-error">{(errors.tradeName as any).message}</p>}
                    </div>
                    <div className="relative z-50">
                      <label className="input-label">الاسم العلمي</label>
                      <Controller
                        name="genericName"
                        control={control}
                        render={({ field }) => (
                          <ScientificNameAutocomplete
                            value={field.value || ""}
                            onChange={field.onChange}
                            onSelectMedicine={(med) => {
                              if (med.tradeName) setValue("tradeName", med.tradeName);
                              if (med.category) setValue("category", med.category);
                              if (med.barcode) setValue("barcode", med.barcode);
                            }}
                            error={errors.genericName?.message as string}
                            disabled={submitting}
                          />
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">التصنيف</label>
                        <input className="input-field" placeholder="Tablet, Syrup..." {...register("category")} />
                      </div>
                      <div>
                        <label className="input-label">الباركود</label>
                        <div className="flex gap-2">
                          <input className="input-field flex-1" dir="ltr" {...register("barcode")} />
                          <button 
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 p-2.5 rounded-lg flex items-center justify-center hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors shrink-0"
                            title="مسح بالكاميرا"
                          >
                            <Camera className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Stock */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-emerald-600 border-b border-slate-200 dark:border-slate-700 pb-2">التسعير والمخزون</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">سعر التكلفة (د.ع)</label>
                        <input type="number" className="input-field" dir="ltr" {...register("costPrice")} />
                      </div>
                      <div>
                        <label className="input-label">سعر البيع (د.ع)</label>
                        <input type="number" className="input-field" dir="ltr" {...register("sellingPrice")} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">المخزون الحالي</label>
                        <input type="number" className="input-field" dir="ltr" {...register("stock")} />
                      </div>
                      <div>
                        <label className="input-label">تاريخ الصلاحية</label>
                        <input type="date" className="input-field" {...register("expiryDate")} />
                      </div>
                    </div>
                    <div>
                      <label className="input-label">المورد</label>
                      <select className="input-field" {...register("supplierId")}>
                        <option value="">-- اختر المورد --</option>
                        {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">إلغاء</button>
              <button type="submit" form="medicine-form" disabled={submitting} className="btn-primary">
                {submitting ? "جاري الحفظ..." : "حفظ المادة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm m-4 shadow-2xl">
            <h3 className="text-lg font-bold text-rose-500 flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5"/> تأكيد الحذف</h3>
            <p className="text-sm text-slate-500">هل أنت متأكد أنك تريد حذف <strong>{deleteTarget.tradeName}</strong>؟</p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="btn-ghost">إلغاء</button>
              <button onClick={handleDelete} className="btn-primary !bg-rose-600 hover:!bg-rose-700">حذف نهائياً</button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Scanner Modal */}
      {showScanner && (
        <CameraScanner 
          onClose={() => setShowScanner(false)}
          onScan={(barcode) => {
            setValue("barcode", barcode, { shouldValidate: true });
            toast.success("تم التقاط الباركود بنجاح!");
          }}
        />
      )}
    </div>
  );
}
