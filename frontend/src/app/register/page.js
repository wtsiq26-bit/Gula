"use client";

// ──────────────────────────────────────────────────────────────
// Gula PMS — Pharmacy Registration Page
// Full-page auth form with Zod validation, animated UI,
// and Clinical Precision design system.
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
const registerSchema = z
  .object({
    pharmacyName: z
      .string()
      .min(2, "Pharmacy name must be at least 2 characters")
      .max(100, "Pharmacy name must be under 100 characters"),
    location: z
      .string()
      .min(2, "Location must be at least 2 characters")
      .max(200, "Location must be under 200 characters"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must be under 50 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
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
    defaultValues: {
      pharmacyName: "",
      location: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // ─── Form Submission ─────────────────────────────────────────
  const onSubmit = async (formData) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/register", {
        pharmacyName: formData.pharmacyName,
        location: formData.location,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      // Store auth data
      localStorage.setItem("gula_token", response.data.token);
      localStorage.setItem("gula_user", JSON.stringify(response.data.user));
      localStorage.setItem("gula_pharmacy", JSON.stringify(response.data.pharmacy));

      toast.success("Pharmacy registered successfully!");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
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
            Create your pharmacy
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Set up Gula for your pharmacy in under a minute
          </p>
        </div>

        {/* ── Registration Form Card ─────────────────────────────── */}
        <div className="glass-card p-8 animate-fade-in-up stagger-2">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Pharmacy Name */}
            <div className="animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
              <label htmlFor="pharmacyName" className="input-label">
                Pharmacy Name
              </label>
              <input
                id="pharmacyName"
                type="text"
                placeholder="e.g., Al-Shifa Pharmacy"
                className={`input-field ${errors.pharmacyName ? "input-error" : ""}`}
                {...register("pharmacyName")}
                disabled={isLoading}
              />
              {errors.pharmacyName && (
                <p className="field-error">
                  <ErrorIcon />
                  {errors.pharmacyName.message}
                </p>
              )}
            </div>

            {/* Location */}
            <div className="animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
              <label htmlFor="location" className="input-label">
                Location
              </label>
              <input
                id="location"
                type="text"
                placeholder="e.g., Baghdad, Al-Karrada"
                className={`input-field ${errors.location ? "input-error" : ""}`}
                {...register("location")}
                disabled={isLoading}
              />
              {errors.location && (
                <p className="field-error">
                  <ErrorIcon />
                  {errors.location.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div className="animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
              <label htmlFor="username" className="input-label">
                Admin Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="e.g., admin_user"
                className={`input-field ${errors.username ? "input-error" : ""}`}
                {...register("username")}
                disabled={isLoading}
              />
              {errors.username && (
                <p className="field-error">
                  <ErrorIcon />
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
              <label htmlFor="email" className="input-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="admin@pharmacy.com"
                className={`input-field ${errors.email ? "input-error" : ""}`}
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="field-error">
                  <ErrorIcon />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="animate-fade-in-up stagger-5" style={{ opacity: 0 }}>
                <label htmlFor="password" className="input-label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  className={`input-field ${errors.password ? "input-error" : ""}`}
                  {...register("password")}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="field-error">
                    <ErrorIcon />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="animate-fade-in-up stagger-6" style={{ opacity: 0 }}>
                <label htmlFor="confirmPassword" className="input-label">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  className={`input-field ${errors.confirmPassword ? "input-error" : ""}`}
                  {...register("confirmPassword")}
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="field-error">
                    <ErrorIcon />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="animate-fade-in-up stagger-7 pt-2" style={{ opacity: 0 }}>
              <button
                id="register-submit"
                type="submit"
                className="btn-primary w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Creating pharmacy...
                  </>
                ) : (
                  <>
                    <PharmacyIcon />
                    Register Pharmacy
                  </>
                )}
              </button>
            </div>
          </form>

          {/* ── Login Link ──────────────────────────────────────── */}
          <div className="mt-6 text-center">
            <p className="text-sm text-on-surface-variant">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary-container font-semibold hover:text-primary transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <p className="mt-8 text-center text-xs text-outline animate-fade-in stagger-7" style={{ opacity: 0 }}>
          &copy; {new Date().getFullYear()} Gula Pharmacy Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}

// ─── Inline Icons ──────────────────────────────────────────────

function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function PharmacyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9v.01" />
      <path d="M9 12v.01" />
      <path d="M9 15v.01" />
      <path d="M9 18v.01" />
    </svg>
  );
}
