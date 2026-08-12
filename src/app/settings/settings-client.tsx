"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { updateCompanyProfile, updateTheme } from "./actions";
import { changePassword } from "@/app/(auth)/actions";

type Settings = {
  businessName: string;
  logoPath: string | null;
  theme: "LIGHT" | "DARK" | "SYSTEM";
};

type ThemeOption = { value: "LIGHT" | "DARK" | "SYSTEM"; label: string; icon: string; description: string };

const THEME_OPTIONS: ThemeOption[] = [
  { value: "LIGHT", label: "Light", icon: "sun", description: "Bright, clean interface" },
  { value: "DARK", label: "Dark", icon: "moon", description: "Low-glare dark interface" },
  { value: "SYSTEM", label: "System", icon: "monitor", description: "Follow device preference" },
];

export function SettingsClient({ settings }: { settings: Settings }) {
  const { toast } = useToast();
  const [businessName, setBusinessName] = React.useState(settings.businessName);
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | null>(settings.logoPath);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [selectedTheme, setSelectedTheme] = React.useState<"LIGHT" | "DARK" | "SYSTEM">(settings.theme);
  const [themeSaving, setThemeSaving] = React.useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [pwdSaving, setPwdSaving] = React.useState(false);
  const [pwdError, setPwdError] = React.useState<string | null>(null);

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
    const result = await updateCompanyProfile({ businessName, logoDataUrl });
    setSaving(false);
    if (result.ok) {
      toast("success", "Company profile saved");
    } else {
      setErrors(result.errors ?? {});
      if (result.errors?._form) toast("error", result.errors._form);
    }
  };

  const handleThemeChange = async (theme: "LIGHT" | "DARK" | "SYSTEM") => {
    setSelectedTheme(theme);
    setThemeSaving(true);
    const result = await updateTheme(theme);
    setThemeSaving(false);
    if (result.ok) {
      toast("success", "Theme updated");
      // Apply the theme to the document for immediate effect
      applyTheme(theme);
    } else {
      toast("error", result.error ?? "Unable to update theme");
    }
  };

  const applyTheme = (theme: "LIGHT" | "DARK" | "SYSTEM") => {
    const root = document.documentElement;
    const effective =
      theme === "SYSTEM"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme.toLowerCase();
    root.classList.toggle("dark", effective === "dark");
    localStorage.setItem("ekdant-theme", theme);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSaving(true);
    const formData = new FormData();
    formData.set("currentPassword", currentPassword);
    formData.set("newPassword", newPassword);
    formData.set("confirmPassword", confirmPassword);
    const result = await changePassword(formData);
    setPwdSaving(false);
    if (result.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast("success", "Password changed successfully");
    } else {
      setPwdError(result.error);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Company information, security and preferences" backHref="/" />

      {/* Company Profile */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 sm:p-6">
        <h2 className="font-semibold text-foreground mb-1">Company Profile</h2>
        <p className="text-sm text-muted mb-4">
          Used in the header, dashboard, reports and printed documents.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-20 h-20 rounded-xl border border-border bg-muted-soft flex items-center justify-center overflow-hidden">
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoDataUrl} alt="Company logo" className="w-full h-full object-contain" />
              ) : (
                <Icon name="building-2" size={28} className="text-muted" />
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-border text-sm text-foreground hover:bg-muted-soft cursor-pointer transition-colors">
                <Icon name="upload" size={14} />
                {logoDataUrl ? "Replace logo" : "Upload logo"}
                <input type="file" accept="image/*" onChange={handleLogo} className="sr-only" />
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

          {errors._form && <p className="text-sm text-danger" role="alert">{errors._form}</p>}

          <div className="flex gap-3">
            <Button type="submit" loading={saving} disabled={!businessName.trim()}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Appearance */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 sm:p-6 mt-4">
        <h2 className="font-semibold text-foreground mb-1">Appearance</h2>
        <p className="text-sm text-muted mb-4">
          Choose how the application looks on this device.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleThemeChange(option.value)}
              className={[
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                selectedTheme === option.value
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:bg-muted-soft",
              ].join(" ")}
            >
              <Icon name={option.icon} size={20} className={selectedTheme === option.value ? "text-primary" : "text-muted"} />
              <div>
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="text-xs text-muted mt-0.5">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
        {themeSaving && <p className="text-sm text-muted mt-3">Saving theme...</p>}
      </div>

      {/* Security */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 sm:p-6 mt-4">
        <h2 className="font-semibold text-foreground mb-1">Security</h2>
        <p className="text-sm text-muted mb-4">
          Change your password to keep your account secure.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {pwdError && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-soft border border-danger/20 px-3 py-2.5 text-sm text-danger" role="alert">
              <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
              <span>{pwdError}</span>
            </div>
          )}

          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-foreground mb-1.5">
              Current Password
            </label>
            <input
              id="currentPassword"
              type={showPassword ? "text" : "password"}
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-1.5">
              New Password
            </label>
            <input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 pr-11 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground font-medium"
            >
              <Icon name={showPassword ? "x-circle" : "eye"} size={14} />
              {showPassword ? "Hide passwords" : "Show passwords"}
            </button>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Re-enter new password"
            />
          </div>

          <Button type="submit" loading={pwdSaving}>
            Change Password
          </Button>
        </form>
      </div>
    </div>
  );
}