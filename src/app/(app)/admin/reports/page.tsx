import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, Eye, XCircle } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { DoctorPhoto } from "@/components/doctor-photo";
import { StatusPill } from "@/components/status-pill";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth";
import { REPORT_REASONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BanButton, RpcButton } from "../ban-dialog";

export const metadata: Metadata = { title: "Reports" };

type Report = {
  id: string; status: "open" | "reviewing" | "actioned" | "dismissed"; reason: string; details: string; evidence: string[];
  transcript: { sender: "reporter" | "reported"; body: string; image_path: string | null; sent_at: string }[] | null;
  admin_note: string | null; created_at: string; reviewed_at: string | null; reviewed_by: string | null;
  reporter_id: string; reporter_name: string; reporter_photo: string;
  reported_id: string; reported_name: string; reported_photo: string; reported_email: string | null; reported_is_bot: boolean;
  reported_banned_at: string | null; reports_against: number;
};

const TABS = [
  { key: "open", label: "Open" },
  { key: "actioned", label: "Actioned" },
  { key: "dismissed", label: "Dismissed" },
] as const;
const SEVERE = new Set(["sexual_harassment", "unsolicited_explicit_content", "threats", "underage", "scam_or_spam", "self_harm"]);
const reasonLabel = (r: string) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;
const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Safety queue: read the report, the evidence and the chat copy, then dismiss, act or ban. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase } = await requireProfile();
  const { status: raw } = await searchParams;
  const status = TABS.find((t) => t.key === raw)?.key ?? "open";
  const { data } = await supabase.rpc("admin_list_reports", { p_status: status });
  const rows = (data ?? []) as Report[];

  const paths = rows.flatMap((r) => r.evidence ?? []);
  const { data: signed } = paths.length ? await supabase.storage.from("report-evidence").createSignedUrls(paths, 900) : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl ?? undefined]));

  return (
    <BlurFade>
      <PageHeader title="Reports" subtitle="Newest first. Severe reasons (harassment, threats, scams, underage) are outlined in red." />
      <nav aria-label="Report status" className="mb-6 flex w-full items-center overflow-x-auto rounded-full border bg-card p-1 shadow-sm md:w-fit">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "open" ? "/admin/reports" : `/admin/reports?status=${t.key}`}
            aria-current={t.key === status ? "page" : undefined}
            className={cn("whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-medium transition-all duration-300", t.key === status ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="rounded-xl border py-16 text-center">
          <p className="font-semibold">{status === "open" ? "No open reports. The ward is calm." : `No ${status} reports.`}</p>
        </div>
      ) : (
        <ul className="space-y-5">
          {rows.map((r) => (
            <li key={r.id} id={r.id} className="scroll-mt-24">
              <Card className={cn(SEVERE.has(r.reason) && r.status !== "dismissed" && "border-red-500/40")}>
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={SEVERE.has(r.reason) ? "cancelled" : "pending"}>{reasonLabel(r.reason)}</StatusPill>
                    <StatusPill status={r.status === "open" ? "pending" : r.status === "reviewing" ? "progress" : r.status === "actioned" ? "completed" : "neutral"}>{r.status}</StatusPill>
                    {r.reported_banned_at ? <StatusPill status="cancelled">Banned</StatusPill> : null}
                    <span className="ml-auto text-caption text-muted-foreground tabular-nums">{fmt(r.created_at)}</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <Link href={`/admin/users/${r.reporter_id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent">
                      <DoctorPhoto src={r.reporter_photo} alt="" size={40} className="size-10 shrink-0" />
                      <span className="min-w-0"><span className="block text-caption text-muted-foreground">Reported by</span><span className="block text-body-sm font-semibold">{r.reporter_name}</span></span>
                    </Link>
                    <ArrowRight className="mx-auto hidden size-5 text-muted-foreground sm:block" />
                    <Link href={`/admin/users/${r.reported_id}`} className="flex items-center gap-3 rounded-lg border border-red-500/30 p-3 hover:bg-accent">
                      <DoctorPhoto src={r.reported_photo} alt="" size={40} className="size-10 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-caption text-muted-foreground">Reported member{r.reported_is_bot ? " (demo bot)" : ""}</span>
                        <span className="block text-body-sm font-semibold">{r.reported_name}</span>
                        <span className="block text-caption text-muted-foreground">{r.reports_against} {r.reports_against === 1 ? "report" : "reports"} in total{r.reported_email ? ` · ${r.reported_email}` : ""}</span>
                      </span>
                    </Link>
                  </div>

                  {r.details ? <p className="rounded-lg bg-muted/50 px-4 py-3 text-body-sm">“{r.details}”</p> : null}

                  {r.evidence?.length ? (
                    <div>
                      <p className="mb-2 text-body-sm font-medium">Evidence</p>
                      <div className="flex flex-wrap gap-2">
                        {r.evidence.map((p, i) => (
                          <a key={p} href={urlFor.get(p)} target="_blank" rel="noreferrer" className="block size-24 overflow-hidden rounded-lg border bg-muted hover:opacity-90">
                            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                            <img src={urlFor.get(p)} alt={`Evidence ${i + 1}`} className="size-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {r.transcript?.length ? (
                    <details className="rounded-lg border">
                      <summary className="cursor-pointer px-4 py-2.5 text-body-sm font-medium">Chat copy ({r.transcript.length} messages)</summary>
                      <ol className="max-h-80 space-y-2 overflow-y-auto border-t p-4">
                        {r.transcript.map((m, i) => (
                          <li key={i} className={cn("max-w-[85%] rounded-lg px-3 py-2 text-body-sm", m.sender === "reported" ? "bg-red-500/10" : "ml-auto bg-muted")}>
                            <span className="block text-caption text-muted-foreground">{m.sender === "reported" ? r.reported_name : r.reporter_name} · {fmt(m.sent_at)}</span>
                            {m.body || (m.image_path ? "[photo]" : "")}
                          </li>
                        ))}
                      </ol>
                    </details>
                  ) : null}

                  {r.admin_note ? <p className="text-caption text-muted-foreground">Note: {r.admin_note}{r.reviewed_by ? ` (${r.reviewed_by})` : ""}</p> : null}

                  <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                    {r.status === "open" ? (
                      <RpcButton fn="admin_update_report" args={{ p_report: r.id, p_status: "reviewing" }} label="Mark reviewing" done="Marked as reviewing." size="sm" icon={<Eye />} />
                    ) : null}
                    {r.status === "open" || r.status === "reviewing" ? (
                      <>
                        <RpcButton fn="admin_update_report" args={{ p_report: r.id, p_status: "dismissed", p_note: "No violation found." }} label="Dismiss" done="Report dismissed." size="sm" variant="ghost" icon={<XCircle />} />
                        <RpcButton fn="admin_update_report" args={{ p_report: r.id, p_status: "actioned", p_note: "Warning noted." }} label="Resolve (warn)" done="Report resolved." size="sm" icon={<CheckCircle />} />
                      </>
                    ) : (
                      <RpcButton fn="admin_update_report" args={{ p_report: r.id, p_status: "open" }} label="Reopen" done="Report reopened." size="sm" variant="ghost" />
                    )}
                    {r.reported_is_bot ? null : r.reported_banned_at ? (
                      <RpcButton fn="admin_unban_user" args={{ p_profile: r.reported_id }} label="Unban" done={`${r.reported_name} is unbanned.`} size="sm" confirm={`Unban ${r.reported_name}?`} />
                    ) : (
                      <BanButton profileId={r.reported_id} name={r.reported_name} size="sm" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </BlurFade>
  );
}
