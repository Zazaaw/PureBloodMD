import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChatCircleDots, ClipboardText, Flag, HeartStraight, Prohibit, SealCheck, UserPlus, Users } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { DoctorPhoto } from "@/components/doctor-photo";
import { StatusPill } from "@/components/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { REPORT_REASONS } from "@/lib/constants";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { AdminHero } from "./hero";

export const metadata: Metadata = { title: "Admin" };

type Stats = {
  users: number; new_7d: number; active_24h: number; verified: number; pending_verifications: number; open_reports: number;
  banned: number; paused: number; matches_24h: number; messages_24h: number; emr_posts_24h: number; romance: number; connect: number;
  signups_14d: { day: string; n: number }[];
};

const reasonLabel = (r: string) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

/** Admin home: the numbers that matter, and what is waiting for a human. */
export default async function AdminOverview() {
  const { supabase, profile } = await requireProfile();
  const [{ data: stats }, { data: pending }, { data: reports }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.rpc("admin_list_verifications", { p_status: "pending" }),
    supabase.rpc("admin_list_reports", { p_status: "open" }),
  ]);
  const s = stats as Stats;
  const peak = Math.max(1, ...s.signups_14d.map((d) => d.n));

  const tiles = [
    { label: "Members", value: s.users, hint: `+${s.new_7d} this week`, icon: Users, href: "/admin/users" },
    { label: "New this week", value: s.new_7d, hint: "fresh passports", icon: UserPlus, href: "/admin/users" },
    { label: "Verified", value: s.verified, hint: `${s.users ? Math.round((s.verified / s.users) * 100) : 0}% of members`, icon: SealCheck, href: "/admin/users?filter=verified" },
    { label: "Pending verification", value: s.pending_verifications, hint: "waiting for review", href: "/admin/verification", alert: s.pending_verifications > 0, icon: SealCheck },
    { label: "Open reports", value: s.open_reports, hint: "need a decision", href: "/admin/reports", alert: s.open_reports > 0, icon: Flag },
    { label: "Banned", value: s.banned, hint: `${s.paused} paused by themselves`, href: "/admin/users?filter=banned", icon: Prohibit },
    { label: "Matches today", value: s.matches_24h, hint: `${s.messages_24h} messages by members`, icon: HeartStraight },
    { label: "EMR posts today", value: s.emr_posts_24h, hint: "by members", href: "/admin/emr", icon: ClipboardText },
  ];

  return (
    <BlurFade>
      <AdminHero
        name={profile.display_name}
        founder={Boolean(profile.is_founder)}
        queues={[
          { href: "/admin/verification", label: s.pending_verifications === 1 ? "verification waiting" : "verifications waiting", n: s.pending_verifications },
          { href: "/admin/reports", label: s.open_reports === 1 ? "open report" : "open reports", n: s.open_reports },
        ]}
        pulse={[
          { label: "Members", value: s.users.toLocaleString("id-ID") },
          { label: "Active 24h", value: s.active_24h.toLocaleString("id-ID") },
          { label: "Matches 24h", value: s.matches_24h.toLocaleString("id-ID") },
          { label: "Messages 24h", value: s.messages_24h.toLocaleString("id-ID") },
        ]}
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t, i) => {
          const Icon = t.icon;
          return (
            <BlurFade key={t.label} delay={i * 0.04}>
              <Link
                href={t.href ?? "/admin"}
                className={cn(
                  "group relative block h-full overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  t.alert && "border-primary/40"
                )}
              >
                {t.alert ? <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary to-primary/40" /> : null}
                <span className="flex items-start justify-between gap-2">
                  <span className="text-overline font-semibold uppercase text-muted-foreground">{t.label}</span>
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", t.alert ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    <Icon weight={t.alert ? "fill" : "regular"} className="size-4" />
                  </span>
                </span>
                <span className={cn("mt-2 block text-h4 font-bold tabular-nums", t.alert && "text-primary")}>{t.value.toLocaleString("id-ID")}</span>
                <span className="block text-caption text-muted-foreground">{t.hint}</span>
              </Link>
            </BlurFade>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-5" /> Sign-ups, last 14 days</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-36 items-end gap-1.5" role="img" aria-label={`Sign-ups per day: ${s.signups_14d.map((d) => d.n).join(", ")}`}>
              {s.signups_14d.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-caption tabular-nums text-muted-foreground">{d.n || ""}</span>
                  <span className="w-full rounded-t-md bg-linear-to-t from-primary/60 to-primary transition-all duration-500" style={{ height: `${Math.max(2, (d.n / peak) * 100)}px` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-caption text-muted-foreground tabular-nums">
              <span>{new Date(s.signups_14d[0].day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ChatCircleDots className="size-5" /> Here for</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[["Romance", s.romance], ["Connect", s.connect]].map(([label, n]) => (
              <div key={label as string}>
                <div className="flex justify-between text-body-sm"><span>{label}</span><span className="tabular-nums">{n}</span></div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${s.users ? ((n as number) / s.users) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><SealCheck className="size-5" /> Waiting for verification</CardTitle>
            <Link href="/admin/verification" className="text-body-sm font-medium text-muted-foreground hover:text-foreground">All <ArrowRight className="inline size-4" /></Link>
          </CardHeader>
          <CardContent>
            {(pending ?? []).length === 0 ? (
              <p className="text-body-sm text-muted-foreground">Nothing waiting. Inbox zero.</p>
            ) : (
              <ul className="divide-y">
                {(pending as { id: string; profile_id: string; display_name: string; photo_url: string; specialty_title: string; created_at: string }[]).slice(0, 5).map((v) => (
                  <li key={v.id}>
                    <Link href={`/admin/users/${v.profile_id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                      <DoctorPhoto src={v.photo_url} alt="" size={36} className="size-9 shrink-0" />
                      <span className="min-w-0 flex-1"><span className="block text-body-sm font-medium">{v.display_name}</span><span className="block text-caption text-muted-foreground">{v.specialty_title}</span></span>
                      <span className="text-caption text-muted-foreground" suppressHydrationWarning>{timeAgo(v.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Flag className="size-5" /> Open reports</CardTitle>
            <Link href="/admin/reports" className="text-body-sm font-medium text-muted-foreground hover:text-foreground">All <ArrowRight className="inline size-4" /></Link>
          </CardHeader>
          <CardContent>
            {(reports ?? []).length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No open reports. The ward is calm.</p>
            ) : (
              <ul className="divide-y">
                {(reports as { id: string; reason: string; reported_id: string; reported_name: string; reported_photo: string; created_at: string; status: string }[]).slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/reports#${r.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                      <DoctorPhoto src={r.reported_photo} alt="" size={36} className="size-9 shrink-0" />
                      <span className="min-w-0 flex-1"><span className="block text-body-sm font-medium">{r.reported_name}</span><span className="block text-caption text-muted-foreground">{reasonLabel(r.reason)}</span></span>
                      <StatusPill status={r.status === "reviewing" ? "progress" : "pending"}>{r.status}</StatusPill>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </BlurFade>
  );
}
