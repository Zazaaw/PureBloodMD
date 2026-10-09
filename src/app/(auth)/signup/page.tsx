import type { Metadata } from "next";
import PageHeader from "@/components/ui/page-header";
import { getAppFlags } from "@/lib/flags";
import { AuthForm } from "../auth-form";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  const { activeCountries } = await getAppFlags();
  return (
    <>
      <PageHeader title="Join the registry" subtitle="MD x MD only. Your passport comes next." className="[&_h3]:mt-0 [&_h3]:text-h5" />
      <AuthForm mode="signup" action={signUp} captcha={true} countries={activeCountries} />
    </>
  );
}
