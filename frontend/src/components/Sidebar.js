"use client";

// ──────────────────────────────────────────────────────────────
// Gula PMS — Sidebar Navigation Component
// Fixed sidebar with navigation links, pharmacy info,
// and responsive collapse functionality.
// ──────────────────────────────────────────────────────────────

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
  {
    label: "Point of Sale",
    href: "/pos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" />
        <path d="M2 13v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6" />
        <path d="M2 9h20v4H2z" />
        <path d="M9 13v4" />
        <path d="M15 13v4" />
      </svg>
    ),
  },
  {
    label: "Suppliers",
    href: "/suppliers",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pharmacy, setPharmacy] = useState(null);
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setPharmacy(JSON.parse(localStorage.getItem("gula_pharmacy") || "{}"));
      setUser(JSON.parse(localStorage.getItem("gula_user") || "{}"));
    } catch { /* ignore */ }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("gula_token");
    localStorage.removeItem("gula_user");
    localStorage.removeItem("gula_pharmacy");
    router.replace("/login");
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-surface-container-lowest border-r border-border-light flex flex-col z-40 transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      {/* ── Logo & Pharmacy Header ────────────────────────────── */}
      <div className="p-4 border-b border-border-light flex items-center gap-3">
        <div className="w-9 h-9 min-w-[36px] rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #003e7a, #0055a4)' }}>
          <Image src="/logo.png" alt="Gula" width={22} height={22} className="invert" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h2 className="text-sm font-semibold text-on-surface truncate">{pharmacy?.name || "Gula"}</h2>
            <p className="text-xs text-on-surface-variant truncate">{pharmacy?.location || ""}</p>
          </div>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary-fixed text-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className={`min-w-[20px] ${isActive ? "text-primary-container" : ""}`}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-5 bg-primary-container rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Collapse Toggle ───────────────────────────────────── */}
      <div className="px-2 py-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}>
            <path d="m15 18-6-6 6-6" />
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* ── User Footer ───────────────────────────────────────── */}
      <div className="p-3 border-t border-border-light">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 min-w-[32px] rounded-full bg-primary-fixed flex items-center justify-center text-xs font-bold text-primary">
            {user?.username?.charAt(0)?.toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-on-surface truncate">{user?.username}</p>
              <p className="text-[10px] text-on-surface-variant">{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
              title="Logout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
