import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/page-header";
import { getUserId } from "@/lib/auth";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "New password" };

/** Reached from the reset email: /auth/confirm verified the link and signed the user in. */
export default async function ResetPasswordPage() {
  if (!(await getUserId())) redirect("/forgot-password?expired=1");
  return (
    <>
      <PageHeader title="Choose a new password" subtitle="Your key has been re-issued. Pick something you'll remember after a night shift." className="[&_h3]:mt-0 [&_h3]:text-h5" />
      <ResetForm />
    </>
  );
}
