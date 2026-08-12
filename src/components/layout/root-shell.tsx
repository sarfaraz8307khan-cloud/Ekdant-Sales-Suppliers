"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "./app-shell";

const AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];

export function RootShell({
  children,
  businessName,
  logoPath,
}: {
  children: React.ReactNode;
  businessName: string;
  logoPath: string | null;
}) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <AppShell businessName={businessName} logoPath={logoPath}>
      {children}
    </AppShell>
  );
}