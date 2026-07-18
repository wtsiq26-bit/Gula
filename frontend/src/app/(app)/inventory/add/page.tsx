"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { ArrowRight, Save, PackagePlus } from "lucide-react";
import Link from "next/link";
import ScientificNameAutocomplete from "@/components/ScientificNameAutocomplete";

// Validation schema
const medicineSchema = z.object({
  tradeName: z.string().min(2, "الاسم التجاري مطلوب (حرفين على الأقل)"),
  genericName: z.string().min(2, "الاسم العلمي مطلوب (حرفين على الأقل)"),
  category: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.number({ error: "يجب إدخال رقم" }).min(0, "السعر لا يمكن أن يكون سالباً"),
  sellingPrice: z.number({ error: "يجب إدخال رقم" }).min(0, "السعر لا يمكن أن يكون سالباً"),
  stock: z.number({ error: "يجب إدخال رقم" }).int("يجب أن يكون رقم صحيح").min(0, "الكمية لا يمكن أن تكون سالبة"),
});

type MedicineFormData = z.infer<typeof medicineSchema>;

export default function AddMedicinePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<MedicineFormData>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      tradeName: "",
      genericName: "",
      category: "",
      barcode: "",
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
    },
  });

  const onSubmit = async (data: MedicineFormData) => {
    setIsSubmitting(true);
    try {
      await api.post("/medicines", data);
      toast.success("تمت إضافة الدواء بنجاح!");
      router.push("/inventory");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في إضافة الدواء");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/inventory"
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <ArrowRight className="w-6 h-6 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <PackagePlus className="w-8 h-8 text-emerald-600" />
            إضافة دواء جديد
          </h1>
          <p className="text-slate-500 mt-1">أدخل بيانات الدواء لإضافته إلى المخزون</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trade Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                الاسم التجاري <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("tradeName")}
                placeholder="مثال: Panadol Extra"
                className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.tradeName ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-700"
                }`}
              />
              {errors.tradeName && <p className="text-red-500 text-sm mt-1">{errors.tradeName.message}</p>}
            </div>

            {/* Generic Name (Autocomplete) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                الاسم العلمي <span className="text-red-500">*</span>
              </label>
              <Controller
                name="genericName"
                control={control}
                render={({ field }) => (
                  <ScientificNameAutocomplete
                    value={field.value}
                    onChange={field.onChange}
                    onSelectMedicine={(med) => {
                      if (med.tradeName) setValue("tradeName", med.tradeName);
                      if (med.category) setValue("category", med.category);
                      if (med.barcode) setValue("barcode", med.barcode);
                    }}
                    error={errors.genericName?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.genericName && <p className="text-red-500 text-sm mt-1">{errors.genericName.message}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                التصنيف
              </label>
              <input
                type="text"
                {...register("category")}
                placeholder="مثال: مسكن ألم"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                الباركود
              </label>
              <input
                type="text"
                {...register("barcode")}
                placeholder="امسح الباركود أو أدخله يدوياً"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                سعر التكلفة (د.ع) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register("costPrice", { valueAsNumber: true })}
                className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.costPrice ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-700"
                }`}
              />
              {errors.costPrice && <p className="text-red-500 text-sm mt-1">{errors.costPrice.message}</p>}
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                سعر البيع (د.ع) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register("sellingPrice", { valueAsNumber: true })}
                className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.sellingPrice ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-700"
                }`}
              />
              {errors.sellingPrice && <p className="text-red-500 text-sm mt-1">{errors.sellingPrice.message}</p>}
            </div>

            {/* Initial Stock */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                الكمية الأولية <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register("stock", { valueAsNumber: true })}
                className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.stock ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-700"
                }`}
              />
              {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock.message}</p>}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
            <Link
              href="/inventory"
              className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-semibold"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/30 flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              حفظ الدواء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
