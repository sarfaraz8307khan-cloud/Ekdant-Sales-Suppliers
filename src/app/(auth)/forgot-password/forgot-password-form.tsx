"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { requestPasswordReset } from "@/app/(auth)/actions";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [loginId, setLoginId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData();
    formData.set("loginId", loginId);

    const result = await requestPasswordReset(null, formData);

    if (result.ok) {
      setSubmitted(true);
      // After a brief pause, route to reset-password with the loginId prefilled
      setTimeout(() => {
        router.push(`/reset-password?loginId=${encodeURIComponent(loginId)}`);
      }, 1800);
    } else {
      setError(result.error);
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-4 space-y-3 animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success-soft">
          <Icon name="check-circle-2" size={24} className="text-success" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Request Received</h2>
        <p className="text-sm text-muted leading-relaxed">
          If this Login ID exists, a password reset code has been generated.
          <br />
          <span className="font-medium text-foreground">
            The reset code is displayed in the server console (valid for 30 minutes).
          </span>
        </p>
        <p className="text-xs text-muted">
          Redirecting to reset page...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">Forgot Password?</h2>
        <p className="text-sm text-muted mt-1">
          Enter your Login ID to request a password reset code.
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
        <div className="relative">
          <Icon name="user" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="resetLoginId"
            name="loginId"
            type="text"
            autoComplete="username"
            required
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="Enter your login ID"
            className="w-full h-11 pl-10 pr-3 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? "Sending..." : "Request Reset Code"}
      </Button>

      <div className="rounded-lg bg-primary-soft border border-primary/10 px-3 py-2.5">
        <p className="text-xs text-muted leading-relaxed">
          <span className="font-medium text-foreground">How it works:</span> A reset
          code will be generated and shown in the server console. The code is valid
          for 30 minutes. Use it on the next screen to set a new password.
        </p>
      </div>
    </form>
  );
}