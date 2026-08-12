"use server";

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ensureVehicleTyres } from "@/lib/vehicle-tyres";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const SESSION_COOKIE = "ekdant_session";
// Keep this fallback identical to src/app/(auth)/actions.ts and src/lib/auth.ts.
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "ekdant-dev-secret-change-in-production"
);

export type ResetResult =
  | {
      ok: true;
      stats: {
        vehiclesKept: number;
        tyresAllocated: number;
        recordsDeleted: number;
      };
    }
  | { ok: false; error: string };

/**
 * Resets all transactional business data (purchases, tyre replacements,
 * inventory, drivers, vendors, expenditure, activity) while KEEPING:
 * vehicles + their factory-fitted tyres, tyre models, vehicle types,
 * configuration and the admin user.
 *
 * Requires the logged-in user's password. Wipes in FK-safe order, then
 * re-allocates fresh company-fitted tyres so every vehicle returns to a
 * clean "factory-fitted" state ready for real data entry.
 */
export async function resetApplicationData(
  password: string
): Promise<ResetResult> {
  // 1. Authenticate the session and verify the admin password.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return { ok: false, error: "Not authenticated." };

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    userId = payload.sub as string;
  } catch {
    return { ok: false, error: "Session expired. Please log in again." };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  const valid = await bcrypt.compare(password ?? "", user.passwordHash);
  if (!valid) return { ok: false, error: "Incorrect password." };

  // 2. Wipe transactional data (FK-safe order — no PRAGMA gymnastics needed).
  //    Order matters: lifecycle events before installations, tyres before
  //    their purchase items/purchases/vendors, drivers/vendors last.
  const vehicles = await db.vehicle.findMany({ select: { id: true } });
  let recordsDeleted = 0;

  await db.$transaction(async (tx) => {
    recordsDeleted += (await tx.tyreLifecycleEvent.deleteMany({})).count;
    recordsDeleted += (await tx.installation.deleteMany({})).count;
    recordsDeleted += (await tx.activityLog.deleteMany({})).count;
    recordsDeleted += (await tx.odometerReading.deleteMany({})).count;
    recordsDeleted += (await tx.expenditure.deleteMany({})).count;
    recordsDeleted += (await tx.tyre.deleteMany({})).count;
    recordsDeleted += (await tx.purchaseItem.deleteMany({})).count;
    recordsDeleted += (await tx.purchase.deleteMany({})).count;
    recordsDeleted += (await tx.inventoryAdjustment.deleteMany({})).count;
    recordsDeleted += (await tx.driver.deleteMany({})).count;
    recordsDeleted += (await tx.vendor.deleteMany({})).count;
    recordsDeleted += (await tx.passwordReset.deleteMany({})).count;
    // Vehicles are kept, but drivers are being wiped — detach them.
    await tx.vehicle.updateMany({ data: { driverId: null } });
    // Restart the tyre-ID sequence so fresh factory tyres begin at TYR-000001.
    await tx.applicationSettings.updateMany({ data: { tyreIdNextSeq: 1 } });
  });

  // 3. Re-allocate company-fitted factory tyres for every kept vehicle.
  let tyresAllocated = 0;
  for (const vehicle of vehicles) {
    const stats = await ensureVehicleTyres(vehicle.id);
    tyresAllocated += stats.created;
  }

  await logActivity({
    action: "RESET",
    entityType: "Application",
    description: `Application data reset by ${user.loginId}: ${recordsDeleted} record(s) deleted, ${tyresAllocated} factory tyre(s) re-allocated`,
  });

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/vehicles");
  revalidatePath("/inventory");
  revalidatePath("/purchases");
  revalidatePath("/replace-tyre");
  revalidatePath("/tyre-history");
  revalidatePath("/reports");

  return {
    ok: true,
    stats: { vehiclesKept: vehicles.length, tyresAllocated, recordsDeleted },
  };
}

export async function updateTheme(theme: "LIGHT" | "DARK" | "SYSTEM") {
  try {
    let settings = await db.applicationSettings.findFirst();
    if (!settings) {
      settings = await db.applicationSettings.create({
        data: { theme },
      });
    } else {
      await db.applicationSettings.update({
        where: { id: settings.id },
        data: { theme },
      });
    }
    revalidatePath("/settings");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Unable to update theme." };
  }
}

export type CompanyProfileInput = {
  businessName: string;
  logoDataUrl?: string | null;
};

export async function updateCompanyProfile(data: CompanyProfileInput) {
  const errors: Record<string, string> = {};
  const name = data.businessName?.trim() ?? "";
  if (!name) errors.businessName = "Company name is required";

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    let settings = await db.applicationSettings.findFirst();
    if (!settings) {
      settings = await db.applicationSettings.create({
        data: { businessName: name },
      });
    }

    await db.applicationSettings.update({
      where: { id: settings.id },
      data: {
        businessName: name,
        ...(data.logoDataUrl !== undefined
          ? { logoPath: data.logoDataUrl || null }
          : {}),
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("updateCompanyProfile failed:", error);
    return { ok: false, errors: { _form: "Failed to save company profile." } };
  }
}