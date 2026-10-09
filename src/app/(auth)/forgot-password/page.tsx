import type { Metadata } from "next";
import PageHeader from "@/components/ui/page-header";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  return (
    <>
      <PageHeader
        title="Forgot password?"
        subtitle={expired ? "That reset link expired or was already used. Request a fresh one." : "Happens after every night shift. We'll email you a reset link."}
        className="[&_h3]:mt-0 [&_h3]:text-h5"
      />
      <ForgotForm captcha={true} />
    </>
  );
}
