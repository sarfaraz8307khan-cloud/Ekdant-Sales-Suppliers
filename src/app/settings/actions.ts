"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

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