"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { primaryNav, secondaryNav, mobileBottomNav } from "@/lib/navigation";
import { Icon } from "@/components/ui/icon";
import { BottomSheet } from "@/components/ui/drawer";
import { logout } from "@/app/(auth)/actions";

function CompanyBrand({
  businessName,
  logoPath,
}: {
  businessName: string;
  logoPath: string | null;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 overflow-hidden">
        {logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoPath} alt="logo" className="w-full h-full object-contain" />
        ) : (
          <Icon name="circle-dot" size={18} className="text-white" />
        )}
      </div>
      <div className="leading-tight min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {businessName}
        </p>
        <p className="text-[11px] text-muted">Tyre Management</p>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: { label: string; href: string; icon: string };
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-primary-soft text-primary"
          : "text-muted hover:bg-muted-soft hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon name={item.icon} size={18} />
      {item.label}
    </Link>
  );
}

export function AppShell({
  children,
  businessName,
  logoPath,
}: {
  children: React.ReactNode;
  businessName: string;
  logoPath: string | null;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-background z-30">
        <div className="p-4 border-b border-border">
          <CompanyBrand businessName={businessName} logoPath={logoPath} />
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Primary">
          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
            Main
          </p>
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
          <p className="px-3 pt-4 pb-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
            More
          </p>
          {secondaryNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-danger hover:bg-danger-soft transition-colors"
            >
              <Icon name="x-circle" size={18} />
              Logout
            </button>
          </form>
          <p className="text-[11px] text-muted">© {new Date().getFullYear()}</p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <CompanyBrand businessName={businessName} logoPath={logoPath} />
          <Link
            href="/settings"
            className="p-2 -m-2 rounded-lg hover:bg-muted-soft transition-colors"
            aria-label="Settings"
          >
            <Icon name="settings" size={20} className="text-muted" />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-24 lg:pb-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-background border-t border-border pb-safe"
        aria-label="Primary"
      >
        <div className="grid grid-cols-5 h-16">
          {mobileBottomNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted hover:text-foreground"
              )}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
              secondaryNav.some((s) => isActive(s.href))
                ? "text-primary"
                : "text-muted hover:text-foreground"
            )}
            aria-label="More options"
          >
            <Icon name="more-horizontal" size={20} />
            More
          </button>
        </div>
      </nav>

      {/* Mobile More bottom sheet */}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="space-y-0.5">
          {secondaryNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onClick={() => setMoreOpen(false)}
            />
          ))}
          <form action={logout} className="pt-2 border-t border-border">
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger-soft transition-colors"
            >
              <Icon name="x-circle" size={18} />
              Logout
            </button>
          </form>
        </div>
      </BottomSheet>
    </div>
  );
}