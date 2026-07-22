"use client";

// ──────────────────────────────────────────────────────────────
// Gula PMS — Authenticated App Layout (Arabic RTL)
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Search, Bell } from "lucide-react";
import { api } from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    let token: string | null = null;
    try {
      token = localStorage.getItem("gula_token");
    } catch (e) {
      console.warn("[AppLayout] Failed to read token:", e);
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    let savedUser: any = {};
    let savedPharmacy: any = {};

    try {
      const rawUser = localStorage.getItem("gula_user");
      if (rawUser && rawUser !== "undefined" && rawUser !== "null") {
        savedUser = JSON.parse(rawUser);
      }
      const rawPharm = localStorage.getItem("gula_pharmacy");
      if (rawPharm && rawPharm !== "undefined" && rawPharm !== "null") {
        savedPharmacy = JSON.parse(rawPharm);
      }
    } catch (e) {
      console.warn("[AppLayout] Failed to parse localStorage user:", e);
    }

    const initialUser = {
      ...savedUser,
      name: savedPharmacy?.name || savedUser?.name || "صيدليتي",
      location: savedPharmacy?.location || savedUser?.location || "",
    };

    setCurrentUser(initialUser);
    setIsReady(true);

    // Session Hydration: fetch latest user profile from backend
    api
      .get("/auth/me")
      .then((res) => {
        if (res.data?.data) {
          const freshData = res.data.data;
          const userObj = {
            id: freshData.id,
            username: freshData.username,
            email: freshData.email,
            role: freshData.role,
            name: freshData.name || freshData.pharmacy?.name || "صيدليتي",
            location: freshData.location || freshData.pharmacy?.location || "",
          };
          const pharmacyObj = freshData.pharmacy || {
            id: freshData.pharmacyId,
            name: userObj.name,
            location: userObj.location,
          };
          setCurrentUser(userObj);
          localStorage.setItem("gula_user", JSON.stringify(userObj));
          localStorage.setItem("gula_pharmacy", JSON.stringify(pharmacyObj));
        }
      })
      .catch((err) => {
        console.warn("[AppLayout] Session hydration info:", err?.message || err);
      });
  }, [router]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const displayName = currentUser?.username || "مدير النظام";
  const displayPharmacy = currentUser?.name || "صيدليتي";
  const displayLocation = currentUser?.location || "";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors">
      
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} currentUser={currentUser} />
      
      {/* Main Content Area */}
      <main className={`flex-1 min-h-screen transition-all duration-300 flex flex-col ${isCollapsed ? 'ms-20' : 'ms-64'}`}>
        
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shadow-sm z-40 sticky top-0">
          
          <div className="flex-1">
             <Breadcrumbs />
          </div>

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
                 {displayName.charAt(0).toUpperCase()}
               </div>
               <div className="hidden sm:block">
                 <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{displayName}</p>
                 <p className="text-xs text-slate-500 mt-1">
                   {displayPharmacy} {displayLocation ? `• ${displayLocation}` : ""}
                 </p>
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
