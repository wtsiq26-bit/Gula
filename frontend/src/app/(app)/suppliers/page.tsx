"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import SkeletonTable from "@/components/SkeletonTable";
import { Search, Plus, Edit, Trash, Users, Building, Phone, Mail, AlertTriangle } from "lucide-react";

// ─── Zod Schema ────────────────────────────────────────────
const supplierSchema = z.object({
  name: z.string().min(1, "اسم الشركة مطلوب"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  address: z.string().optional(),
});

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(supplierSchema),
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get(`/suppliers?search=${search}`);
      setSuppliers(res.data);
    } catch (err: any) {
      toast.error(err.message || "فشل تحميل الموردين");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchSuppliers(), 300);
    return () => clearTimeout(timer);
  }, [search, fetchSuppliers]);

  const openModal = (supplier: any = null) => {
    if (supplier) {
      setEditing(supplier);
      reset({
        name: supplier.name,
        contactPerson: supplier.contactPerson || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
      });
    } else {
      setEditing(null);
      reset({ name: "", contactPerson: "", phone: "", email: "", address: "" });
    }
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, data);
        toast.success("تم تحديث المورد بنجاح");
      } else {
        await api.post("/suppliers", data);
        toast.success("تمت إضافة المورد بنجاح");
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message || "فشل حفظ بيانات المورد");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    // Optimistic Delete
    const prev = [...suppliers];
    setSuppliers(prev => prev.filter((s: any) => s.id !== deleteTarget.id));
    setDeleteTarget(null);

    try {
      await api.delete(`/suppliers/${deleteTarget.id}`);
      toast.success("تم حذف المورد");
    } catch (err: any) {
      setSuppliers(prev);
      toast.error(err.message || "فشل حذف المورد");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-emerald-600" />
            الموردين
          </h1>
          <p className="text-sm text-slate-500 mt-1">{suppliers.length} مورد مسجل</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary shadow-sm hover:shadow-md">
          <Plus className="w-4 h-4 me-2" /> إضافة مورد
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="ابحث عن الموردين..."
          className="input-field ps-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Data Table */}
      {loading ? (
        <SkeletonTable columns={6} rows={5} />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden relative">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm text-start">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 shadow-sm backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 font-semibold text-start">اسم الشركة</th>
                  <th className="px-6 py-4 font-semibold text-start">مسؤول التواصل</th>
                  <th className="px-6 py-4 font-semibold text-start">الهاتف</th>
                  <th className="px-6 py-4 font-semibold text-start">البريد الإلكتروني</th>
                  <th className="px-6 py-4 font-semibold text-start">العنوان</th>
                  <th className="px-6 py-4 font-semibold text-end">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      لا يوجد موردين مسجلين.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier: any) => (
                    <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-start">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center">
                            {supplier.name.charAt(0).toUpperCase()}
                          </div>
                          {supplier.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-start">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          {supplier.contactPerson || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-start" dir="ltr">
                        <div className="flex items-center justify-end gap-2">
                          {supplier.phone || '-'}
                          <Phone className="w-4 h-4 text-slate-400" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-start">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          {supplier.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 truncate max-w-[200px] text-start" title={supplier.address}>
                        {supplier.address || '-'}
                      </td>
                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openModal(supplier)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(supplier)} className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-500 hover:text-rose-500 transition-colors">
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
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg m-4 flex flex-col animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600" />
                {editing ? "تعديل المورد" : "إضافة مورد جديد"}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
               <div>
                  <label className="input-label">اسم الشركة *</label>
                  <input className={`input-field ${errors.name ? "input-error" : ""}`} {...register("name")} autoFocus />
                  {errors.name && <p className="field-error">{(errors.name as any).message}</p>}
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">مسؤول التواصل</label>
                    <input className="input-field" {...register("contactPerson")} />
                  </div>
                  <div>
                    <label className="input-label">الهاتف</label>
                    <input className="input-field" dir="ltr" {...register("phone")} />
                  </div>
               </div>

               <div>
                  <label className="input-label">البريد الإلكتروني</label>
                  <input type="email" dir="ltr" className={`input-field ${errors.email ? "input-error" : ""}`} {...register("email")} />
                  {errors.email && <p className="field-error">{(errors.email as any).message}</p>}
               </div>

               <div>
                  <label className="input-label">العنوان</label>
                  <textarea className="input-field min-h-[80px]" {...register("address")} />
               </div>
               
               <div className="flex justify-end pt-4 gap-3">
                 <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">إلغاء</button>
                 <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "جاري الحفظ..." : "حفظ المورد"}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm m-4 shadow-2xl">
            <h3 className="text-lg font-bold text-rose-500 flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5"/> تأكيد الحذف</h3>
            <p className="text-sm text-slate-500">هل أنت متأكد من رغبتك بحذف <strong>{deleteTarget.name}</strong>؟</p>
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
