import Link from "next/link";
import { AuthShell } from "@/app/(auth)/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Password Recovery">
      <ForgotPasswordForm />
      <p className="text-center mt-4">
        <Link
          href="/login"
          className="text-sm text-primary hover:text-primary font-medium transition-colors"
        >
          ← Back to Sign In
        </Link>
      </p>
    </AuthShell>
  );
}
