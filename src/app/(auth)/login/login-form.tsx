"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/app/(auth)/actions";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [showPassword, setShowPassword] = React.useState(false);
  const [loginId, setLoginId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData();
    formData.set("loginId", loginId);
    formData.set("password", password);

    const result = await login(null, formData);

    if (result.ok) {
      router.push(from || "/");
      router.refresh();
    } else {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-danger-soft border border-danger/20 px-3 py-2.5 text-sm text-danger animate-fade-in-up" role="alert">
          <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="loginId" className="block text-sm font-medium text-foreground mb-1.5">
          Login ID
        </label>
        <div className="relative">
          <Icon name="user" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="loginId"
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

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
          Password
        </label>
        <div className="relative">
          <Icon name="circle-dot" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full h-11 pl-10 pr-11 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted-soft text-muted hover:text-muted transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <Icon name={showPassword ? "x-circle" : "eye"} size={18} />
          </button>
        </div>
      </div>

      <div className="text-right">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary hover:text-primary transition-colors"
        >
          Forgot Password?
        </Link>
      </div>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? "Signing in..." : "Sign In"}
      </Button>

      <p className="text-center text-xs text-muted pt-2">
        Protected area — authorized personnel only
      </p>
    </form>
  );
}