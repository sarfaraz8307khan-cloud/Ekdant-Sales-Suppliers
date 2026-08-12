import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { RootShell } from "@/components/layout/root-shell";
import { db } from "@/lib/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Tyre Management System",
    template: "%s | Tyre Management System",
  },
  description:
    "Tyre lifecycle management for commercial vehicle fleets — purchase, inventory, installation, replacement, and disposal tracking.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4f46e5",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await db.applicationSettings.findFirst();
  const theme = settings?.theme ?? "SYSTEM";
  // Server-side initial theme class: explicit themes paint correctly on first
  // render. suppressHydrationWarning is required because the bootstrap script
  // below intentionally toggles the class on <html> before hydration (e.g. when
  // localStorage or the device preference disagrees with the stored setting).
  const initialThemeClass = theme === "DARK" ? "dark" : undefined;

  return (
    <html lang="en" className={initialThemeClass} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("ekdant-theme")||${JSON.stringify(theme)};var e=t==="SYSTEM"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t.toLowerCase();document.documentElement.classList.toggle("dark",e==="dark");}catch(_){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>
          <RootShell
            businessName={settings?.businessName ?? "Ekdant Sales & Suppliers"}
            logoPath={settings?.logoPath ?? null}
          >
            {children}
          </RootShell>
        </ToastProvider>
      </body>
    </html>
  );
}
