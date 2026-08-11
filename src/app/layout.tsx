import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/layout/app-shell";
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

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>
          <AppShell
            businessName={settings?.businessName ?? "Ekdant Sales & Suppliers"}
            logoPath={settings?.logoPath ?? null}
          >
            {children}
          </AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}