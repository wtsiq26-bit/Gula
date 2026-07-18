import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";

// ──────────────────────────────────────────────────────────────
// Gula PMS — Root Layout (Arabic RTL)
// ──────────────────────────────────────────────────────────────

export const metadata = {
  title: "Gula — نظام كولا لإدارة الصيدليات",
  description: "نظام حديث وآمن وشامل لإدارة مخزون ومبيعات الصيدليات.",
  keywords: ["صيدلية", "إدارة", "نقطة بيع", "مخزون", "أدوية"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster
            position="bottom-left"
            toastOptions={{
              duration: 4000,
              className: "dark:bg-slate-800 dark:text-white dark:border-slate-700",
              style: {
                background: "#ffffff",
                color: "#0f172a", // slate-900
                border: "1px solid #e2e8f0", // slate-200
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
                fontFamily: "Tajawal, sans-serif",
                direction: "rtl"
              },
              success: {
                iconTheme: {
                  primary: "#059669", // emerald-600
                  secondary: "#ffffff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#e11d48", // rose-600
                  secondary: "#ffffff",
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
