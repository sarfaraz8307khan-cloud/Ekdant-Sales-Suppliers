export const primaryNav = [
  { label: "Dashboard", href: "/", icon: "layout-dashboard" },
  { label: "Vehicles", href: "/vehicles", icon: "truck" },
  { label: "Replace Tyre", href: "/replace-tyre", icon: "wrench" },
  { label: "Inventory", href: "/inventory", icon: "package" },
  { label: "Purchases", href: "/purchases", icon: "shopping-cart" },
  { label: "Expenditure", href: "/expenditure", icon: "indian-rupee" },
] as const;

export const secondaryNav = [
  { label: "Tyre History", href: "/tyre-history", icon: "history" },
  { label: "Vendors", href: "/vendors", icon: "building-2" },
  { label: "Drivers", href: "/drivers", icon: "user" },
  { label: "Tyre Models", href: "/tyre-models", icon: "circle-dot" },
  { label: "Vehicle Configurations", href: "/vehicle-configurations", icon: "settings-2" },
  { label: "Reports", href: "/reports", icon: "bar-chart-3" },
  { label: "Settings", href: "/settings", icon: "settings" },
] as const;

export const mobileBottomNav = [
  { label: "Home", href: "/", icon: "layout-dashboard" },
  { label: "Replace", href: "/replace-tyre", icon: "wrench" },
  { label: "Vehicles", href: "/vehicles", icon: "truck" },
  { label: "Inventory", href: "/inventory", icon: "package" },
] as const;
