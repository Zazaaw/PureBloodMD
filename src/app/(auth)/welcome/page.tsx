import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Cards, ChatCircleDots, IdentificationCard, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { getUserId } from "@/lib/auth";
import { getAppFlags } from "@/lib/flags";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Email confirmed" };

/** Landing spot of the confirmation email: celebrate, then send them to the right next step. */
export default async function WelcomePage() {
  const userId = await getUserId();
  if (!userId) redirect("/login?link=expired");

  const supabase = await createClient();
  const [{ data: auth }, { data: profile }, flags] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle(),
    getAppFlags(),
  ]);
  const hasPassport = Boolean(profile);

  const steps = [
    { icon: IdentificationCard, title: "Build your passport", body: "Photos, specialty, hospital. Two minutes, scrubs encouraged." },
    { icon: Cards, title: "Start triage", body: `${flags.dailySwipeLimit} swipes and 1 Super Like a day while we launch.` },
    { icon: ChatCircleDots, title: "Consult", body: "Write within 24 hours of a match, or it flatlines." },
  ];

  return (
    <div className="text-center">
      <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
        <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
        <SealCheck weight="fill" className="relative size-9" />
      </span>
      <p className="mt-5 text-overline font-semibold uppercase text-primary">Email confirmed</p>
      <h1 className="mt-1 text-h5 font-bold">Welcome to the registry, Doctor.</h1>
      <p className="mt-2 text-body-sm text-muted-foreground">
        {auth.user?.email ? (
          <>
            <span className="font-medium text-foreground">{auth.user.email}</span> checks out. Pulse present, airway patent.
          </>
        ) : (
          "Pulse present, airway patent."
        )}
      </p>

      {hasPassport ? null : (
        <ol className="mt-6 space-y-3 text-left">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex gap-3 rounded-lg border p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-body-sm font-semibold">
                  <span className="mr-1 font-mono text-muted-foreground tabular-nums">{i + 1}.</span>
                  {title}
                </span>
                <span className="block text-caption text-muted-foreground">{body}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <Button asChild className="mt-6 w-full">
        <Link href={hasPassport ? "/discover" : "/onboarding"}>
          {hasPassport ? "Back to triage" : "Build my passport"} <ArrowRight />
        </Link>
      </Button>
      <p className="mt-3 text-caption text-muted-foreground">You&apos;re signed in on this device. No need to log in again.</p>
    </div>
  );
}
