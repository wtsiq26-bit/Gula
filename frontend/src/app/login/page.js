"use client";

// ──────────────────────────────────────────────────────────────
// Gula PMS — Login Page
// Clean, focused login form with Zod validation and
// Clinical Precision design system.
// ──────────────────────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

// ─── Zod Validation Schema ──────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
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
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // ─── Form Submission ─────────────────────────────────────────
  const onSubmit = async (formData) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      // Store auth data
      localStorage.setItem("gula_token", response.data.token);
      localStorage.setItem("gula_user", JSON.stringify(response.data.user));
      localStorage.setItem("gula_pharmacy", JSON.stringify(response.data.pharmacy));

      toast.success(`Welcome back, ${response.data.user.username}!`);
      router.push("/dashboard");
    } catch (error) {
      toast.error(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* ── Logo & Header ──────────────────────────────────────── */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #003e7a, #0055a4)' }}>
              <Image
                src="/logo.png"
                alt="Gula Logo"
                width={40}
                height={40}
                className="invert"
                priority
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Sign in to your Gula pharmacy dashboard
          </p>
        </div>

        {/* ── Login Form Card ────────────────────────────────────── */}
        <div className="glass-card p-8 animate-fade-in-up stagger-2">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email */}
            <div className="animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
              <label htmlFor="email" className="input-label">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <MailIcon />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@pharmacy.com"
                  className={`input-field pl-10 ${errors.email ? "input-error" : ""}`}
                  {...register("email")}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="field-error">
                  <ErrorIcon />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
              <label htmlFor="password" className="input-label">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <LockIcon />
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className={`input-field pl-10 ${errors.password ? "input-error" : ""}`}
                  {...register("password")}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
              {errors.password && (
                <p className="field-error">
                  <ErrorIcon />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="animate-fade-in-up stagger-3 pt-2" style={{ opacity: 0 }}>
              <button
                id="login-submit"
                type="submit"
                className="btn-primary w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LoginIcon />
                    Sign In
                  </>
                )}
              </button>
            </div>
          </form>

          {/* ── Register Link ───────────────────────────────────── */}
          <div className="mt-6 text-center">
            <p className="text-sm text-on-surface-variant">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-primary-container font-semibold hover:text-primary transition-colors"
              >
                Register your pharmacy
              </Link>
            </p>
          </div>
        </div>

        {/* ── Feature Highlights ─────────────────────────────────── */}
        <div className="mt-8 grid grid-cols-3 gap-3 animate-fade-in stagger-5" style={{ opacity: 0 }}>
          <FeatureChip icon={<InventoryIcon />} label="Inventory" />
          <FeatureChip icon={<POSIcon />} label="Point of Sale" />
          <FeatureChip icon={<ChartIcon />} label="Analytics" />
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <p className="mt-6 text-center text-xs text-outline animate-fade-in stagger-6" style={{ opacity: 0 }}>
          &copy; {new Date().getFullYear()} Gula Pharmacy Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}

// ─── Feature Chip Component ────────────────────────────────────

function FeatureChip({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg bg-surface-container-lowest border border-border-light text-center transition-all hover:border-primary-fixed-dim hover:bg-surface-container-low">
      <span className="text-primary-container">{icon}</span>
      <span className="text-xs font-medium text-on-surface-variant">{label}</span>
    </div>
  );
}

// ─── Inline Icons ──────────────────────────────────────────────

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#727783" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#727783" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function POSIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}
