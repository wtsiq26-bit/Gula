"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Home } from "lucide-react";

const pathTranslations: Record<string, string> = {
  "dashboard": "لوحة التحكم",
  "pos": "نقطة البيع",
  "inventory": "المخزون",
  "suppliers": "الموردين"
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const paths = pathname.split("/").filter(Boolean);

  if (paths.length === 0) return null;

  return (
    <nav className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400">
      <Link href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center transition-colors">
        <Home className="w-4 h-4" />
      </Link>
      
      {paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join("/")}`;
        const isLast = index === paths.length - 1;
        const translatedPath = pathTranslations[path] || path;

        return (
          <div key={path} className="flex items-center">
            {/* Note: ChevronLeft is used instead of ChevronRight because the direction is RTL */}
            <ChevronLeft className="w-4 h-4 mx-1 text-slate-300 dark:text-slate-600" />
            {isLast ? (
              <span className="text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {translatedPath}
              </span>
            ) : (
              <Link href={href} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                {translatedPath}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
