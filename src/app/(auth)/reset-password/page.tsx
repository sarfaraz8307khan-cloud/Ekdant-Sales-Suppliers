import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/app/(auth)/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Password Reset">
      <Suspense fallback={<div className="min-h-[320px]" />}>
        <ResetPasswordForm />
      </Suspense>
      <p className="text-center mt-4">
        <Link href="/login" className="text-sm text-primary hover:text-primary font-medium transition-colors">
          ← Back to Sign In
        </Link>
      </p>
    </AuthShell>
  );
}