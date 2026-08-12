import { Suspense } from "react";
import { AuthShell } from "@/app/(auth)/auth-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <AuthShell title="Tyre Management System">
      <Suspense fallback={<div className="min-h-[320px]" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
