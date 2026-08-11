"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { updateCompanyProfile } from "./actions";

type Settings = {
  businessName: string;
  logoPath: string | null;
};

export function SettingsClient({
  settings,
  hasAuth,
}: {
  settings: Settings;
  hasAuth: boolean;
}) {
  const { toast } = useToast();
  const [businessName, setBusinessName] = React.useState(settings.businessName);
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | null>(
    settings.logoPath
  );
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("error", "Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("error", "Logo must be under 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const result = await updateCompanyProfile({
      businessName,
      logoDataUrl,
    });
    setSaving(false);
    if (result.ok) {
      toast("success", "Company profile saved");
    } else {
      setErrors(result.errors ?? {});
      if (result.errors?._form) toast("error", result.errors._form);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Company information and preferences" />

      <div className="bg-white rounded-xl border border-border shadow-sm p-4 sm:p-6">
        <h2 className="font-semibold text-foreground mb-1">Company Profile</h2>
        <p className="text-sm text-muted mb-4">
          Used in the header, dashboard, reports and printed documents.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-20 h-20 rounded-xl border border-border bg-muted-soft flex items-center justify-center overflow-hidden">
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoDataUrl}
                  alt="Company logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Icon name="building-2" size={28} className="text-muted" />
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-border text-sm text-foreground hover:bg-muted-soft cursor-pointer transition-colors">
                <Icon name="upload" size={14} />
                {logoDataUrl ? "Replace logo" : "Upload logo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogo}
                  className="sr-only"
                />
              </label>
              {logoDataUrl && (
                <button
                  type="button"
                  onClick={() => setLogoDataUrl(null)}
                  className="block text-xs text-muted hover:text-danger transition-colors"
                >
                  Remove logo
                </button>
              )}
              <p className="text-xs text-muted">PNG/JPG, max 2 MB</p>
            </div>
          </div>

          <Input
            label="Company name"
            name="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            error={errors.businessName}
            required
          />

          {errors._form && (
            <p className="text-sm text-danger" role="alert">
              {errors._form}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" loading={saving} disabled={!businessName.trim()}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {hasAuth && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-4 sm:p-6 mt-4">
          <h2 className="font-semibold text-foreground mb-1">Security</h2>
          <p className="text-sm text-muted">
            Login, password and session controls are configured through the
            platform's authentication.
          </p>
        </div>
      )}
    </div>
  );
}