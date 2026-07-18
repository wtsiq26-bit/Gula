"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Using direct return since Next.js 14+ supports suppressHydrationWarning on <html>
  // This avoids the "script tag" hydration error on the client.
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
