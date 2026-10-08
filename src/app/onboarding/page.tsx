import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BlurFade from "@/components/effects/blur-fade";
import PageHeader from "@/components/ui/page-header";
import { getUserId } from "@/lib/auth";
import { COUNTRY_CODES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Doctor passport" };

export default async function OnboardingPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
  if (data) redirect("/discover");
  // Country picked at sign-up (stored on the auth user) pre-fills the passport.
  const { data: auth } = await supabase.auth.getUser();
  const signupCountry = String(auth.user?.user_metadata?.country ?? "");
  const defaultCountry = (COUNTRY_CODES as readonly string[]).includes(signupCountry) ? signupCountry : "ID";

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <BlurFade>
        <PageHeader
          title="Build your doctor passport"
          subtitle="PureBloodMD enforces strict medical verification to preserve the sacred MD x MD covenant."
        />
        <OnboardingForm userId={userId} defaultCountry={defaultCountry} />
      </BlurFade>
    </main>
  );
}
