"use client";

// ──────────────────────────────────────────────────────────────
// Gula PMS — Authenticated App Layout
// Wraps all authenticated pages with sidebar navigation.
// Redirects to /login if no token is found.
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("gula_token");
    if (!token) {
      router.replace("/login");
    } else {
      setIsReady(true);
    }
  }, [router]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <div className="spinner" style={{ borderColor: 'rgba(0, 85, 164, 0.2)', borderTopColor: '#0055a4', width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <Sidebar />
      <main className="ml-[260px] min-h-screen transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
