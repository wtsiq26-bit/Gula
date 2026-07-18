"use client";

// ──────────────────────────────────────────────────────────────
// Gula PMS — Authenticated App Layout (Arabic RTL)
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Search, User, Bell } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gula_token");
    if (!token) {
      router.replace("/login");
    } else {
      const user = JSON.parse(localStorage.getItem("gula_user") || "{}");
      setUsername(user.username || "مدير النظام");
      setIsReady(true);
    }
  }, [router]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="spinner border-emerald-600 w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors">
      
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      
      {/* Main Content Area - Using `ms-` for Margin Start in RTL (which is the Right side) */}
      <main className={`flex-1 min-h-screen transition-all duration-300 flex flex-col ${isCollapsed ? 'ms-20' : 'ms-64'}`}>
        
        {/* Clean Topbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shadow-sm z-40 sticky top-0">
          
          {/* Right Side of Topbar (Breadcrumbs) */}
          <div className="flex-1">
             <Breadcrumbs />
          </div>

          {/* Left Side of Topbar (Search & Profile) */}
          <div className="flex items-center gap-4">
             <div className="relative hidden md:block">
               <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="بحث سريع..." 
                 className="bg-slate-100 dark:bg-slate-800 border-none rounded-full py-2 ps-10 pe-4 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none w-64 text-slate-900 dark:text-slate-100"
               />
             </div>
             
             <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
               <Bell className="w-5 h-5" />
               <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-slate-900"></span>
             </button>

             <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

             <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors">
               <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                 {username.charAt(0).toUpperCase()}
               </div>
               <div className="hidden sm:block">
                 <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{username}</p>
                 <p className="text-xs text-slate-500 mt-1">المسؤول</p>
               </div>
             </div>
          </div>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {children}
        </div>
        
      </main>
    </div>
  );
}
