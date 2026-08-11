import { db } from "@/lib/db";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await db.applicationSettings.findFirst();

  return (
    <SettingsClient
      settings={{
        businessName: settings?.businessName ?? "Ekdant Sales & Suppliers",
        logoPath: settings?.logoPath ?? null,
      }}
      hasAuth={false}
    />
  );
}