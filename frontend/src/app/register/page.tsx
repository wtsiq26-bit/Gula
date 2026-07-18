"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { Mail, Lock, AlertCircle, ArrowRight, Building, User, MapPin } from "lucide-react";

// ─── Zod Schema (Arabic Messages) ──────────────────────────
const registerSchema = z
  .object({
    pharmacyName: z.string().min(2, "اسم الصيدلية يجب أن يكون حرفين على الأقل"),
    location: z.string().min(2, "الموقع مطلوب"),
    username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 حروف على الأقل").regex(/^[a-zA-Z0-9_]+$/, "يسمح فقط بالحروف الانجليزية والأرقام"),
    email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 رموز على الأقل"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
  });

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/register", {
        pharmacyName: formData.pharmacyName,
        location: formData.location,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      localStorage.setItem("gula_token", response.data.token);
      localStorage.setItem("gula_user", JSON.stringify(response.data.user));
      localStorage.setItem("gula_pharmacy", JSON.stringify(response.data.pharmacy));

      toast.success("تم تسجيل الصيدلية بنجاح!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "فشل التسجيل. يرجى المحاولة لاحقاً.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-50 dark:bg-slate-950">
      
      {/* ── Right Panel (Brand Area) ── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center bg-emerald-600 relative overflow-hidden text-white p-12">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10 text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl mb-8 border border-white/20">
             <img src="/logo.png" alt="Gula Logo" className="w-12 h-12 invert brightness-0" />
          </div>
          <h1 className="text-4xl font-extrabold mb-4 leading-tight">ابدأ رحلتك مع Gula<br/> لإدارة الصيدليات</h1>
          <p className="text-emerald-100 text-lg max-w-md leading-relaxed">
            أنشئ حساب صيدليتك في أقل من دقيقة وانضم إلى المستقبل الرقمي لإدارة الأدوية والمخزون بكفاءة عالية.
          </p>
        </div>
      </div>

      {/* ── Left Panel (Form Area) ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-in-up">
          
          <div className="text-center lg:text-start mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">إنشاء حساب جديد</h2>
            <p className="text-slate-500 dark:text-slate-400">أدخل تفاصيل صيدليتك للبدء</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            
            {/* Pharmacy Name */}
            <div>
              <label htmlFor="pharmacyName" className="input-label">اسم الصيدلية</label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-5 h-5" />
                </div>
                <input
                  id="pharmacyName"
                  type="text"
                  placeholder="مثال: صيدلية الشفاء"
                  className={`input-field ps-11 ${errors.pharmacyName ? "input-error" : ""}`}
                  {...register("pharmacyName")}
                  disabled={isLoading}
                />
              </div>
              {errors.pharmacyName && <p className="field-error"><AlertCircle className="w-4 h-4"/> {(errors.pharmacyName as any).message}</p>}
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="input-label">موقع الصيدلية</label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <input
                  id="location"
                  type="text"
                  placeholder="بغداد، المنصور"
                  className={`input-field ps-11 ${errors.location ? "input-error" : ""}`}
                  {...register("location")}
                  disabled={isLoading}
                />
              </div>
              {errors.location && <p className="field-error"><AlertCircle className="w-4 h-4"/> {(errors.location as any).message}</p>}
            </div>

            {/* Username & Email Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="username" className="input-label">اسم المستخدم</label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    dir="ltr"
                    placeholder="admin_123"
                    className={`input-field ps-11 text-start ${errors.username ? "input-error" : ""}`}
                    {...register("username")}
                    disabled={isLoading}
                  />
                </div>
                {errors.username && <p className="field-error"><AlertCircle className="w-4 h-4"/> {(errors.username as any).message}</p>}
              </div>

              <div>
                <label htmlFor="email" className="input-label">البريد الإلكتروني</label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    dir="ltr"
                    placeholder="email@example.com"
                    className={`input-field ps-11 text-start ${errors.email ? "input-error" : ""}`}
                    {...register("email")}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="field-error"><AlertCircle className="w-4 h-4"/> {(errors.email as any).message}</p>}
              </div>
            </div>

            {/* Passwords Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="input-label">كلمة المرور</label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    dir="ltr"
                    className={`input-field ps-11 text-start ${errors.password ? "input-error" : ""}`}
                    {...register("password")}
                    disabled={isLoading}
                  />
                </div>
                {errors.password && <p className="field-error"><AlertCircle className="w-4 h-4"/> {(errors.password as any).message}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="input-label">تأكيد المرور</label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    dir="ltr"
                    className={`input-field ps-11 text-start ${errors.confirmPassword ? "input-error" : ""}`}
                    {...register("confirmPassword")}
                    disabled={isLoading}
                  />
                </div>
                {errors.confirmPassword && <p className="field-error"><AlertCircle className="w-4 h-4"/> {(errors.confirmPassword as any).message}</p>}
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5 mt-4 text-lg shadow-emerald-500/20 shadow-lg">
              {isLoading ? (
                <div className="spinner border-white w-5 h-5"></div>
              ) : (
                <>
                  إنشاء الحساب
                  <ArrowRight className="w-5 h-5 ms-2 rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="text-emerald-600 font-bold hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          </div>

        </div>
      </div>
      
    </div>
  );
}
