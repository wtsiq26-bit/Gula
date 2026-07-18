// ──────────────────────────────────────────────────────────────
// Gula PMS — Root Page
// Redirects unauthenticated users to Login, and
// authenticated users to Dashboard.
// ──────────────────────────────────────────────────────────────

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("gula_token");
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  // Minimal loading state while redirecting
  return (
    <div className="auth-bg min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #003e7a, #0055a4)' }}>
          <img src="/logo.png" alt="Gula" width={28} height={28} style={{ filter: 'invert(1)' }} />
        </div>
        <div className="spinner" style={{ borderColor: 'rgba(0, 85, 164, 0.2)', borderTopColor: '#0055a4' }} />
      </div>
    </div>
  );
}
