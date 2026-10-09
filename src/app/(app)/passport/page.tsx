import type { Metadata } from "next";
import Link from "next/link";
import { ArrowSquareOut, Crown, LockSimple, Prohibit, ShieldCheck, ShieldWarning, SignOut } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { BlockedList } from "@/components/blocked-list";
import { InstallApp } from "@/components/pwa";
import { StatusPill } from "@/components/status-pill";
import { VerificationCard } from "@/components/verification-card";
import { VipToggle } from "@/components/vip-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth";
import { PLANS, SPECIALTIES, VIP_PERKS, countryName, formatMoney } from "@/lib/constants";
import type { BlockedRow, Credentials, VerificationRequest } from "@/lib/types";
import { isVerified } from "@/lib/verified";
import { AccountCard } from "./account-card";
import { CredentialsForm } from "./credentials-form";
import { PassportForm } from "./passport-form";
import { PassportShell } from "./passport-shell";
import { PASSPORT_TABS, type PassportTab } from "./tabs";

export const metadata: Metadata = { title: "Doctor passport" };

const SAFETY_RULES = [
  "Never share your phone, WhatsApp, address or ID numbers. Numbers in chat are hidden automatically.",
  "Never send or request money, transfers, e-wallet top-ups or crypto. We are not responsible for any transaction.",
  "Meet in public, tell a friend, and leave if it feels wrong. Emergency in Indonesia: 112.",
];

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function PassportPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { supabase, profile, userId, subscription, flags } = await requireProfile();
  const tabs = flags.vipEnabled ? PASSPORT_TABS : PASSPORT_TABS.filter((t) => t !== "VIP");
  const initialTab = tabs.find((t) => t.toLowerCase() === tab?.toLowerCase()) ?? "Profile";
  const [{ data: cred }, { data: blocked }, { data: request }] = await Promise.all([
    supabase.from("credentials").select("*").eq("profile_id", profile.id).maybeSingle<Credentials>(),
    supabase.rpc("get_blocked"),
    supabase
      .from("verification_requests")
      .select("id,status,reviewer_note,created_at,reviewed_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<VerificationRequest>(),
  ]);
  const verified = isVerified(profile);
  const { data: isAdmin } = await supabase.rpc("is_admin");
  const blockedRows = (blocked ?? []) as BlockedRow[];
  const plan = subscription?.active ? PLANS.find((p) => p.id === subscription.plan) : null;
  const cancelling = Boolean(subscription?.active && subscription.cancel_at_period_end);



  const panels: Record<PassportTab, React.ReactNode> = {
    Profile: <PassportForm userId={userId} profile={profile} countries={flags.activeCountries} />,

    Badge: (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Blue badge</CardTitle>
            <CardDescription>Only members whose ID and medical license were checked by a human get it.</CardDescription>
          </CardHeader>
          <CardContent>
            <VerificationCard userId={userId} verified={verified} latest={request ?? null} />
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LockSimple className="size-5" /> Credentials</CardTitle>
            <CardDescription>Private. Other doctors never see these.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="space-y-1.5 rounded-lg border border-dashed border-primary/40 p-4 font-mono text-caption">
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">REG</dt><dd className="text-right">{cred?.str_number ?? "Pending"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">SPEC</dt><dd className="text-right">{SPECIALTIES[profile.specialty].code}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">ALMA</dt><dd className="text-right">{cred ? `${cred.alma_mater} '${String(cred.class_year).slice(2)}` : "Pending"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">HANDWRITING</dt><dd className="text-right">100% illegible</dd></div>
            </dl>
            <CredentialsForm credentials={cred ?? null} />
          </CardContent>
        </Card>
      </div>
    ),

    VIP: (
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Crown weight="fill" className="size-5 text-amber-500" /> Your plan</CardTitle>
            <CardDescription>
              {subscription?.active && plan
                ? `${plan.label} plan, ${formatMoney(Number(subscription.amount), subscription.currency)}. ${cancelling ? "Cancelled, VIP ends" : "Renews"} ${fmtDate(subscription.period_end)}.`
                : "Free plan: 10 bubbles per consult, 1 Super Like a day."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusPill status={subscription?.active ? (cancelling ? "pending" : "completed") : "neutral"}>
              {subscription?.active ? (cancelling ? "VIP until period end" : "VIP") : "Free"}
            </StatusPill>
            <VipToggle isVip={profile.is_vip} country={profile.country ?? "ID"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>What VIP unlocks</CardTitle>
            <CardDescription>Same doctors. Fewer interruptions from the bubble police.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[...VIP_PERKS, "5 Super Likes a day instead of 1"].map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-body-sm">
                  <Crown weight="fill" className="size-4 shrink-0 text-amber-500" /> {p}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    ),

    Settings: (
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Prohibit className="size-5" /> Blocked doctors</CardTitle>
            <CardDescription>They can&apos;t see you or message you. Reports you sent stay on file.</CardDescription>
          </CardHeader>
          <CardContent>
            <BlockedList rows={blockedRows} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldWarning className="size-5" /> House rules</CardTitle>
            <CardDescription>Use Report and Block in any chat when something feels wrong.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {SAFETY_RULES.map((r) => (
                <li key={r} className="flex gap-2.5 text-body-sm">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" /> {r}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm"><Link href="/terms">Terms <ArrowSquareOut /></Link></Button>
              <Button asChild variant="outline" size="sm"><Link href="/privacy">Privacy <ArrowSquareOut /></Link></Button>
            </div>
          </CardContent>
        </Card>
        <InstallApp />
        <Card>
          <CardHeader>
            <CardTitle>Sign out</CardTitle>
            <CardDescription>Your matches wait for you. A new match flatlines if nobody writes within 24 hours; a consult ends after 30 days of silence.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/auth/signout" method="post">
              <Button variant="outline" type="submit"><SignOut /> Sign out</Button>
            </form>
          </CardContent>
        </Card>
        {isAdmin ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5" /> Admin dashboard</CardTitle>
              <CardDescription>Developer only. Members, reports, bans, doctor verification, EMR moderation and launch switches.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild><Link href="/admin">Open admin</Link></Button>
            </CardContent>
          </Card>
        ) : null}
        <AccountCard userId={userId} paused={Boolean(profile.deactivated_at)} vipEnabled={flags.vipEnabled} />
      </div>
    ),
  };

  return (
    <main className="pb-dock mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:pb-10">
      <BlurFade>
        <PageHeader
          title="Doctor passport"
          subtitle="Strict medical verification, to preserve the sacred MD x MD covenant."
        />
        <PassportShell
          initialTab={initialTab}
          me={{ name: profile.display_name, photo: profile.photo_url, subtitle: `${profile.specialty_title} · ${profile.hospital} · ${countryName(profile.country ?? "ID")}`, verified }}
          tabs={tabs}
          panels={panels}
        />
      </BlurFade>
    </main>
  );
}
