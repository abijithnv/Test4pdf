import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Test4pdf — PDF to Practice",
  description: "Upload a PDF and instantly generate an interactive quiz",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning is required here because the inline script below
    // mutates data-theme and data-font on <html> before React hydrates.
    // React sees a mismatch between server HTML (no attributes) and client DOM
    // (attributes already set by the script). This prop silences that warning
    // for the <html> element only — it does NOT suppress child component warnings.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('qf-theme')||( window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',t);var f=localStorage.getItem('qf-font')||'lora';document.documentElement.setAttribute('data-font',f);}catch(e){document.documentElement.setAttribute('data-theme','dark');document.documentElement.setAttribute('data-font','lora');}})();` }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
