"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  LayoutDashboard, 
  PackageSearch, 
  MonitorCheck, 
  Users, 
  LogOut, 
  ChevronRight, 
  ChevronLeft, 
  Sun, 
  Moon,
  FileSpreadsheet,
  TrendingUp,
  Bell
} from "lucide-react";

export default function Sidebar({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean, setIsCollapsed: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem("gula_token");
    router.replace("/login");
  };

  const navLinks = [
    { name: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
    { name: "نقطة البيع", href: "/pos", icon: MonitorCheck },
    { name: "المخزون", href: "/inventory", icon: PackageSearch },
    { name: "التنبيهات", href: "/alerts", icon: Bell },
    { name: "التقارير المالية", href: "/reports", icon: TrendingUp },
    { name: "استيراد الأدوية (Excel)", href: "/inventory/import", icon: FileSpreadsheet },
    { name: "الموردين", href: "/suppliers", icon: Users },
  ];


  return (
    <aside 
      className={`fixed top-0 right-0 h-full bg-white dark:bg-slate-900 flex flex-col shadow-xl z-50 border-l border-slate-200 dark:border-slate-800 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* ─── Header ─── */}
      <div className={`p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 ${isCollapsed ? "justify-center" : ""}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex-shrink-0 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <img src="/logo.png" alt="Gula" className="w-6 h-6 invert brightness-0" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col whitespace-nowrap">
              <span className="font-bold text-lg leading-tight text-slate-900 dark:text-white">صيدلية النور</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">نظام إدارة الصيدليات</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all group relative ${
                isActive 
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              } ${isCollapsed ? "justify-center" : ""}`}
              title={isCollapsed ? link.name : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
              {!isCollapsed && <span>{link.name}</span>}
              
              {/* Active Indicator Right Border */}
              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-emerald-600 rounded-l-md" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ─── Footer Controls ─── */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all w-full ${isCollapsed ? "justify-center" : ""}`}
          title={isCollapsed ? "تبديل المظهر" : undefined}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
          {!isCollapsed && <span>{theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>}
        </button>

        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-all w-full ${isCollapsed ? "justify-center" : ""}`}
          title={isCollapsed ? "تسجيل الخروج" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>

      {/* Toggle Collapse Button - RTL aware */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-3 top-8 w-6 h-6 bg-slate-900 dark:bg-slate-700 text-white rounded-full flex items-center justify-center shadow-md hover:bg-emerald-600 transition-colors z-50"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
