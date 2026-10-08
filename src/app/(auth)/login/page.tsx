import type { Metadata } from "next";
import PageHeader from "@/components/ui/page-header";
import { AuthForm } from "../auth-form";
import { signIn } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const { link } = await searchParams;
  return (
    <>
      <PageHeader title="Welcome back" subtitle="Your post-call coffee date is waiting." className="[&_h3]:mt-0 [&_h3]:text-h5" />
      {link === "expired" ? (
        <p role="alert" className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-body-sm text-amber-600 dark:text-amber-400">
          That confirmation link expired or was already used. Sign in, or sign up again for a fresh link.
        </p>
      ) : null}
      <AuthForm mode="login" action={signIn} captcha={process.env.SUPABASE_AUTH_CAPTCHA === "on"} />
    </>
  );
}
