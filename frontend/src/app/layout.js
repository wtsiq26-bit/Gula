import "./globals.css";
import { Toaster } from "react-hot-toast";

// ──────────────────────────────────────────────────────────────
// Gula PMS — Root Layout
// Applies Inter font, global meta tags, and toast notifications.
// ──────────────────────────────────────────────────────────────

export const metadata = {
  title: "Gula — Pharmacy Management System",
  description:
    "A modern, secure, and comprehensive pharmacy management system for inventory, sales, and operations.",
  keywords: ["pharmacy", "management", "POS", "inventory", "medicine"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: "toast-custom",
            style: {
              background: "#ffffff",
              color: "#0b1c30",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
            },
            success: {
              iconTheme: {
                primary: "#006b5c",
                secondary: "#ffffff",
              },
            },
            error: {
              iconTheme: {
                primary: "#ba1a1a",
                secondary: "#ffffff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
