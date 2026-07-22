"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";

// ─── Zod Schema (Arabic Messages) ──────────────────────────
const loginSchema = z.object({
  email: z.string().min(1, "البريد الإلكتروني مطلوب").email("يرجى إدخال بريد إلكتروني صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      const userPayload = {
        ...response.data.user,
        name: response.data.pharmacy?.name || response.data.user?.name,
        location: response.data.pharmacy?.location || response.data.user?.location,
      };
      const pharmacyPayload = response.data.pharmacy || {
        id: response.data.user?.pharmacyId,
        name: userPayload.name,
        location: userPayload.location,
      };

      localStorage.setItem("gula_token", response.data.token);
      localStorage.setItem("gula_user", JSON.stringify(userPayload));
      localStorage.setItem("gula_pharmacy", JSON.stringify(pharmacyPayload));

      toast.success(`مرحباً بك مجدداً، ${response.data.user.username}!`);
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "فشل تسجيل الدخول. يرجى التحقق من بياناتك.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-50 dark:bg-slate-950">
      
      {/* ── Right Panel (Brand Area) ── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center bg-emerald-600 relative overflow-hidden text-white p-12">
        {/* Abstract Pattern / Gradient Decor */}
        <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10 text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl mb-8 border border-white/20">
             <img src="/logo.png" alt="Gula Logo" className="w-12 h-12 invert brightness-0" />
          </div>
          <h1 className="text-4xl font-extrabold mb-4 leading-tight">مرحباً بك في نظام Gula<br/> لإدارة الصيدليات</h1>
          <p className="text-emerald-100 text-lg max-w-md leading-relaxed">
            النظام الأسرع والأكثر أماناً لإدارة مخزونك، مبيعاتك، وموردينك من واجهة واحدة متكاملة ومصممة خصيصاً للسرعة.
          </p>
        </div>
      </div>

      {/* ── Left Panel (Form Area) ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md animate-fade-in-up">
          
          <div className="text-center lg:text-start mb-10">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">تسجيل الدخول</h2>
            <p className="text-slate-500 dark:text-slate-400">أدخل بياناتك للوصول إلى لوحة التحكم الخاصة بك</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            
            {/* Email Field */}
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
                  placeholder="admin@example.com"
                  className={`input-field ps-11 ${errors.email ? "input-error" : ""}`}
                  {...register("email")}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="field-error"><AlertCircle className="w-4 h-4"/> {(errors.email as any).message}</p>
              )}
            </div>

            {/* Password Field */}
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
                  placeholder="••••••••"
                  className={`input-field ps-11 ${errors.password ? "input-error" : ""}`}
                  {...register("password")}
                  disabled={isLoading}
                />
              </div>
              {errors.password && (
                <p className="field-error"><AlertCircle className="w-4 h-4"/> {(errors.password as any).message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5 text-lg shadow-emerald-500/20 shadow-lg">
              {isLoading ? (
                <div className="spinner border-white w-5 h-5"></div>
              ) : (
                <>
                  تسجيل الدخول
                  <ArrowRight className="w-5 h-5 ms-2 rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              ليس لديك صيدلية مسجلة؟{" "}
              <Link href="/register" className="text-emerald-600 font-bold hover:underline">
                أنشئ حسابك الآن
              </Link>
            </p>
          </div>

        </div>
      </div>
      
    </div>
  );
}
