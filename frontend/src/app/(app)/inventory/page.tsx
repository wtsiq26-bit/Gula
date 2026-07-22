"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import SkeletonTable from "@/components/SkeletonTable";
import ScientificNameAutocomplete from "@/components/ScientificNameAutocomplete";
import { 
  Search, Plus, Edit, Trash, Image as ImageIcon, Box, AlertTriangle, 
  FileSpreadsheet, QrCode, Link2, CheckCircle2, X
} from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

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
  const [medicines, setMedicines] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  
  // First-Scan Barcode Binding Modal State
  const [showBindingModal, setShowBindingModal] = useState(false);
  const [unlinkedBarcode, setUnlinkedBarcode] = useState("");
  const [selectedMedicineForLink, setSelectedMedicineForLink] = useState<any>(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState("");
  const [linkQuantity, setLinkQuantity] = useState("10");
  const [linkExpiryDate, setLinkExpiryDate] = useState("");
  const [linkingSubmitting, setLinkingSubmitting] = useState(false);

  // Image Upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Inline Editing
  const [inlineEditCell, setInlineEditCell] = useState<{ id: string, field: string } | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState("");

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm({
    resolver: zodResolver(medicineSchema),
  });

  const fetchMedicines = useCallback(async () => {
    try {
      const res: any = await api.get(`/medicines?search=${encodeURIComponent(search)}&limit=1000`);
      let items: any[] = [];
      if (Array.isArray(res)) {
        items = res;
      } else if (Array.isArray(res?.data)) {
        items = res.data;
      } else if (Array.isArray(res?.medicines)) {
        items = res.medicines;
      }
      setMedicines(items);
    } catch (err: any) {
      toast.error(err.message || "فشل تحميل المخزون");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data || []);
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

  // ─── First-Scan Hardware Barcode Scanner Listener ─────────
  const handleScannedBarcode = useCallback((barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    const found = medicines.find((m) => m.barcode === cleanBarcode);
    if (found) {
      toast.success(`تم العثور على الدواء: ${found.tradeName} (المخزون الحالي: ${found.stock})`, { icon: "📦" });
      setSearch(found.tradeName);
    } else {
      // Unlinked barcode -> trigger First-Scan Binding Workflow!
      setUnlinkedBarcode(cleanBarcode);
      setSelectedMedicineForLink(null);
      setLinkSearchTerm("");
      
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setLinkExpiryDate(nextYear.toISOString().split("T")[0]);
      
      setShowBindingModal(true);
      toast("باركود جديد غير مسجل! اختر دواءً من القائمة لربطه به.", { icon: "🔗" });
    }
  }, [medicines]);

  useBarcodeScanner(handleScannedBarcode);

  // ─── Filtered local medicines for barcode linking autocomplete
  const filteredLocalMedicines = useMemo(() => {
    if (!linkSearchTerm.trim()) return medicines.slice(0, 10);
    const term = linkSearchTerm.toLowerCase();
    return medicines.filter((m) => 
      (m.tradeName && m.tradeName.toLowerCase().includes(term)) ||
      (m.scientificName && m.scientificName.toLowerCase().includes(term)) ||
      (m.genericName && m.genericName.toLowerCase().includes(term))
    ).slice(0, 15);
  }, [medicines, linkSearchTerm]);

  // ─── Submit First-Scan Binding ──────────────────────────────
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicineForLink) {
      toast.error("يرجى اختيار الدواء المراد ربطه من القائمة");
      return;
    }
    if (!unlinkedBarcode.trim()) {
      toast.error("يرجى إدخال أو مسح الباركود المراد ربطه");
      return;
    }
    if (!linkExpiryDate) {
      toast.error("تاريخ الصلاحية مطلوب لإضافة الشحنة المخزنية");
      return;
    }

    setLinkingSubmitting(true);
    try {
      await api.post("/medicines/link", {
        medicineId: selectedMedicineForLink.id,
        barcode: unlinkedBarcode.trim(),
        quantity: parseInt(linkQuantity, 10) || 1,
        expiryDate: linkExpiryDate,
      });

      toast.success(`تم ربط الباركود (${unlinkedBarcode}) بالدواء (${selectedMedicineForLink.tradeName}) وتحديث المخزون بنجاح!`, {
        duration: 5000,
        icon: "🔗",
      });

      setShowBindingModal(false);
      setSelectedMedicineForLink(null);
      setUnlinkedBarcode("");
      fetchMedicines();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "فشل عملية ربط الباركود");
    } finally {
      setLinkingSubmitting(false);
    }
  };

  // ─── Semantic Row Styles ──────────────────────────────────
  const getRowStyle = (medicine: any) => {
    const today = new Date();
    const expiry = medicine.expiryDate ? new Date(medicine.expiryDate) : null;
    
    if (expiry && expiry < today) {
      return "bg-rose-50 dark:bg-rose-900/20 border-s-4 border-s-rose-500";
    }
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

    const prev = [...medicines];
    setMedicines(prev => prev.map((m: any) => m.id === medicine.id ? { ...m, [field]: parseFloat(newValue) || newValue } : m));
    setInlineEditCell(null);

    try {
      await api.put(`/medicines/${medicine.id}`, { [field]: newValue });
      toast.success("تم التحديث");
    } catch (err: any) {
      setMedicines(prev);
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
        genericName: medicine.scientificName || medicine.genericName || "",
        category: medicine.category || medicine.dosageForm || "",
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
    
    const prev = [...medicines];
    setMedicines(prev => prev.filter((m: any) => m.id !== deleteTarget.id));
    setDeleteTarget(null);

    try {
      await api.delete(`/medicines/${deleteTarget.id}`);
      toast.success("تم الحذف بنجاح");
    } catch (err: any) {
      setMedicines(prev);
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setUnlinkedBarcode("");
              setSelectedMedicineForLink(null);
              setLinkSearchTerm("");
              const nextYear = new Date();
              nextYear.setFullYear(nextYear.getFullYear() + 1);
              setLinkExpiryDate(nextYear.toISOString().split("T")[0]);
              setShowBindingModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            <QrCode className="w-4 h-4" />
            <span>ربط باركود عند أول مسح</span>
          </button>
          
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

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="ابحث في المخزون بالاسم أو امسح الباركود..."
          className="input-field ps-10 w-full"
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
                        <div className="text-xs text-slate-500 font-normal">{medicine.scientificName || medicine.genericName || "-"}</div>
                      </td>
                      <td className="px-6 py-4 text-start text-slate-500 font-mono text-xs">
                        {medicine.barcode ? (
                          <span className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {medicine.barcode}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedMedicineForLink(medicine);
                              setLinkSearchTerm(medicine.tradeName);
                              setUnlinkedBarcode("");
                              const nextYear = new Date();
                              nextYear.setFullYear(nextYear.getFullYear() + 1);
                              setLinkExpiryDate(nextYear.toISOString().split("T")[0]);
                              setShowBindingModal(true);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 underline flex items-center gap-1"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>ربط باركود</span>
                          </button>
                        )}
                      </td>
                      
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

      {/* ─── First-Scan Barcode Binding Modal ──────────────────────── */}
      {showBindingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowBindingModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl m-4 overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-950/30 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-600" />
                الربط عند أول مسح (First-Scan Binding)
              </h2>
              <button onClick={() => setShowBindingModal(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLinkSubmit} className="p-6 space-y-5">
              {/* Barcode Display or Input */}
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl space-y-2">
                <label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4" />
                  الباركود الممسوح بجهاز القارئ المادي:
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="امسح الباركود بجهاز القارئ..."
                  value={unlinkedBarcode}
                  onChange={(e) => setUnlinkedBarcode(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg font-mono text-base font-bold text-indigo-900 dark:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              {/* Autocomplete Search Bar for existing local medicines */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  ابحث عن الدواء المسجل بالصيدلية لربطه: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="اكتب اسم الدواء التجاري أو العلمي..."
                    value={linkSearchTerm}
                    onChange={(e) => {
                      setLinkSearchTerm(e.target.value);
                      setSelectedMedicineForLink(null);
                    }}
                    className="input-field w-full"
                  />
                  
                  {/* Results Dropdown */}
                  {!selectedMedicineForLink && filteredLocalMedicines.length > 0 && (
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredLocalMedicines.map((med) => (
                        <div
                          key={med.id}
                          onClick={() => {
                            setSelectedMedicineForLink(med);
                            setLinkSearchTerm(med.tradeName);
                          }}
                          className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer flex justify-between items-center transition-colors"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{med.tradeName}</div>
                            <div className="text-xs text-slate-400">{med.scientificName || med.genericName || "غير محدد"}</div>
                          </div>
                          <div className="text-xs font-mono text-slate-500">
                            {med.barcode ? `باركود: ${med.barcode}` : "بدون باركود"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Medicine Confirmation Card */}
              {selectedMedicineForLink && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">الدواء المحدد للربط:</div>
                    <div className="font-bold text-slate-900 dark:text-white text-base">{selectedMedicineForLink.tradeName}</div>
                    <div className="text-xs text-slate-500">{selectedMedicineForLink.scientificName || selectedMedicineForLink.genericName || "-"}</div>
                  </div>
                  <div className="text-end">
                    <span className="inline-block px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold rounded-lg text-xs">
                      المخزون الحالي: {selectedMedicineForLink.stock || 0}
                    </span>
                  </div>
                </div>
              )}

              {/* Batch Intake Fields */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الكمية المضافة (Batch Quantity) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={linkQuantity}
                    onChange={(e) => setLinkQuantity(e.target.value)}
                    className="input-field w-full font-mono text-center"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ الصلاحية (Expiry Date) *
                  </label>
                  <input
                    type="date"
                    value={linkExpiryDate}
                    onChange={(e) => setLinkExpiryDate(e.target.value)}
                    className="input-field w-full"
                    required
                  />
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowBindingModal(false)}
                  className="btn-ghost"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!selectedMedicineForLink || !unlinkedBarcode.trim() || linkingSubmitting}
                  className="btn-primary !bg-indigo-600 hover:!bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-500/25 flex items-center gap-2 px-6 py-2.5"
                >
                  {linkingSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  <span>ربط الباركود وإضافة المخزون</span>
                </button>
              </div>
            </form>
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
                        <input className="input-field" dir="ltr" placeholder="امسح الباركود بالجهاز..." {...register("barcode")} />
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
    </div>
  );
}
