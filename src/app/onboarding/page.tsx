import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BlurFade from "@/components/effects/blur-fade";
import PageHeader from "@/components/ui/page-header";
import { getUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Doctor passport" };

export default async function OnboardingPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
  if (data) redirect("/discover");

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <BlurFade>
        <PageHeader
          title="Build your doctor passport"
          subtitle="PureBloodMD enforces strict medical verification to preserve the sacred MD x MD covenant."
        />
        <OnboardingForm userId={userId} />
      </BlurFade>
    </main>
  );
}
