"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/app/(auth)/actions";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLoginId = searchParams.get("loginId") ?? "";

  const [loginId, setLoginId] = React.useState(initialLoginId);
  const [resetCode, setResetCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const formData = new FormData();
    formData.set("loginId", loginId);
    formData.set("resetCode", resetCode);
    formData.set("newPassword", newPassword);

    const result = await resetPassword(null, formData);

    if (result.ok) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1600);
    } else {
      setError(result.error);
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-4 space-y-3 animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success-soft">
          <Icon name="check-circle-2" size={24} className="text-success" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Password Reset</h2>
        <p className="text-sm text-muted">
          Your password has been updated successfully. Redirecting to sign in...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">Reset Password</h2>
        <p className="text-sm text-muted mt-1">
          Enter the reset code from the server console and your new password.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-danger-soft border border-danger/20 px-3 py-2.5 text-sm text-danger animate-fade-in-up" role="alert">
          <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="resetLoginId" className="block text-sm font-medium text-foreground mb-1.5">
          Login ID
        </label>
        <input
          id="resetLoginId"
          type="text"
          required
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          className="w-full h-11 px-3 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          placeholder="Enter your login ID"
        />
      </div>

      <div>
        <label htmlFor="resetCode" className="block text-sm font-medium text-foreground mb-1.5">
          Reset Code
        </label>
        <input
          id="resetCode"
          type="text"
          required
          value={resetCode}
          onChange={(e) => setResetCode(e.target.value.toUpperCase())}
          className="w-full h-11 px-3 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 uppercase tracking-widest"
          placeholder="XXXX-XXXX"
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
          className="w-full h-11 px-3 pr-11 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          placeholder="At least 8 characters"
        />
        <div className="mt-1.5 text-right">
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary font-medium"
          >
            <Icon name={showPassword ? "x-circle" : "eye"} size={14} />
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
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
          className="w-full h-11 px-3 pr-11 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          placeholder="Re-enter new password"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? "Resetting..." : "Reset Password"}
      </Button>
    </form>
  );
}