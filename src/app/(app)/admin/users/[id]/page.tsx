import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowSquareOut, FilePdf, SealCheck } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { DoctorPhoto } from "@/components/doctor-photo";
import { DotPattern } from "@/components/effects/dot-pattern";
import { FounderBadge } from "@/components/founder-badge";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { REPORT_REASONS, SPECIALTIES, countryName } from "@/lib/constants";
import { UUID_RE } from "@/lib/emr";
import type { Profile } from "@/lib/types";
import { BanButton, RpcButton } from "../../ban-dialog";

export const metadata: Metadata = { title: "Member" };

type Detail = {
  profile: Profile & { banned_at: string | null; ban_reason: string | null; created_at: string };
  email: string | null; email_confirmed_at: string | null; last_sign_in_at: string | null;
  signup_meta: Record<string, unknown> | null;
  credentials: { str_number: string; alma_mater: string; class_year: number } | null;
  verifications: { id: string; status: string; created_at: string; reviewer_note: string | null; id_doc_path: string; selfie_path: string | null; license_path: string }[];
  reports_against: { id: string; reason: string; status: string; details: string; created_at: string; reporter: string }[];
  reports_filed: { id: string; reason: string; status: string; created_at: string; reported: string }[];
  counts: { matches: number; messages: number; swipes: number; emr_posts: number; blocked_by: number };
  recent_posts: { id: string; body: string; images: number; created_at: string; parent_id: string | null }[];
  admin_log: { action: string; admin: string; details: Record<string, unknown>; created_at: string }[];
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never");
const reasonLabel = (r: string) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

/** One member, everything a moderator needs: identity, documents, reports, activity, actions. */
export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { supabase } = await requireProfile();
  const { data } = await supabase.rpc("admin_user_detail", { p_profile: id });
  if (!data) notFound();
  const d = data as Detail;
  const p = d.profile;
  const verified = p.identity_verified && p.doctor_verified;
  const latest = d.verifications[0];
  const docPaths = latest ? [latest.id_doc_path, latest.selfie_path, latest.license_path].filter((x): x is string => Boolean(x)) : [];
  const { data: signed } = docPaths.length ? await supabase.storage.from("verification-docs").createSignedUrls(docPaths, 900) : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl ?? undefined]));

  return (
    <BlurFade>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All users</Link>

      <Card className="relative overflow-hidden">
        <DotPattern width={18} height={18} cr={1} className="text-foreground/[0.06] [mask-image:linear-gradient(to_left,white,transparent_60%)]" />
        <span aria-hidden className={`absolute -right-20 -top-20 size-64 rounded-full blur-3xl ${p.banned_at ? "bg-red-500/15" : "bg-primary/10"}`} />
        <CardContent className="relative flex flex-wrap items-start gap-5 p-5 sm:p-6">
          <DoctorPhoto src={p.photo_url} fallback={p.photo_fallback_url} alt="" size={88} className="size-22 shrink-0 rounded-xl ring-4 ring-background shadow-md" />
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="flex flex-wrap items-center gap-2 text-h5 font-bold">
              {p.display_name}
              {verified ? <SealCheck weight="fill" className="size-5 text-sky-500" aria-label="Verified" /> : null}
              {p.is_founder ? <FounderBadge /> : null}
            </h1>
            <p className="text-body-sm text-muted-foreground">{p.specialty_title} ({SPECIALTIES[p.specialty]?.code}) · {p.hospital} · {countryName(p.country ?? "ID")}</p>
            <p className="text-body-sm break-all">{d.email ?? "No email"} {d.email_confirmed_at ? <StatusPill status="completed">email confirmed</StatusPill> : <StatusPill status="pending">email unconfirmed</StatusPill>}</p>
            <p className="text-caption text-muted-foreground">
              {p.gender}, {p.age} · here for {p.intent} · joined {fmt(p.created_at)} · last sign-in {fmt(d.last_sign_in_at)}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {p.banned_at ? <StatusPill status="cancelled">Banned {fmt(p.banned_at)}</StatusPill> : null}
              {p.deactivated_at && !p.banned_at ? <StatusPill status="neutral">Paused by member</StatusPill> : null}
              {d.reports_against.length ? <StatusPill status="pending">{d.reports_against.length} reports against</StatusPill> : null}
            </div>
            {p.ban_reason ? <p className="mt-2 rounded-lg border-l-2 border-red-500 bg-muted/50 px-3 py-2 text-body-sm">Ban reason: {p.ban_reason}</p> : null}
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-col">
            {p.banned_at ? (
              <RpcButton fn="admin_unban_user" args={{ p_profile: p.id }} label="Unban" done={`${p.display_name} is unbanned.`} confirm={`Unban ${p.display_name}? They can sign in again.`} />
            ) : (
              <BanButton profileId={p.id} name={p.display_name} />
            )}
            {verified ? (
              <RpcButton fn="admin_set_verified" args={{ p_profile: p.id, p_verified: false }} label="Revoke badge" done="Blue badge removed." variant="outline" confirm="Remove the blue badge?" />
            ) : (
              <RpcButton fn="admin_set_verified" args={{ p_profile: p.id, p_verified: true }} label="Grant badge" done="Blue badge granted." variant="outline" confirm="Grant the blue badge without a document review?" />
            )}
            <Button variant="ghost" asChild><Link href={`/doctor/${p.id}`}>Public profile <ArrowSquareOut /></Link></Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries({ Matches: d.counts.matches, Messages: d.counts.messages, Swipes: d.counts.swipes, "EMR posts": d.counts.emr_posts, "Blocked by": d.counts.blocked_by }).map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card p-3 shadow-sm">
            <p className="text-overline font-semibold uppercase text-muted-foreground">{k}</p>
            <p className="text-h5 font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Doctor check</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-2 rounded-lg border border-dashed p-3 font-mono text-caption sm:grid-cols-3">
              <div><dt className="text-muted-foreground">STR / NIM</dt><dd>{d.credentials?.str_number ?? "Not given"}</dd></div>
              <div><dt className="text-muted-foreground">ALMA MATER</dt><dd>{d.credentials?.alma_mater ?? "Not given"}</dd></div>
              <div><dt className="text-muted-foreground">CLASS OF</dt><dd>{d.credentials?.class_year ?? "Not given"}</dd></div>
            </dl>
            {latest ? (
              <>
                <p className="text-body-sm">
                  Latest documents: <StatusPill status={latest.status === "approved" ? "completed" : latest.status === "rejected" ? "cancelled" : "pending"}>{latest.status}</StatusPill>{" "}
                  <span className="text-caption text-muted-foreground">{fmt(latest.created_at)}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {([["ID", latest.id_doc_path], ["License", latest.license_path], ...(latest.selfie_path ? [["Selfie (old)", latest.selfie_path]] : [])] as [string, string][]).map(([label, path]) => (
                    <a key={label} href={urlFor.get(path)} target="_blank" rel="noreferrer" className="block">
                      <span className="block aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
                        {path.endsWith(".pdf") ? (
                          <span className="grid size-full place-items-center text-muted-foreground"><FilePdf className="size-7" /></span>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                          <img src={urlFor.get(path)} alt={`${label} document`} className="size-full object-cover" />
                        )}
                      </span>
                      <span className="text-caption text-muted-foreground">{label}</span>
                    </a>
                  ))}
                </div>
                {latest.status === "pending" ? (
                  <Button asChild size="sm"><Link href="/admin/verification">Review in Verification</Link></Button>
                ) : null}
              </>
            ) : (
              <p className="text-body-sm text-muted-foreground">No documents submitted yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Reports against ({d.reports_against.length})</CardTitle></CardHeader>
          <CardContent>
            {d.reports_against.length === 0 ? <p className="text-body-sm text-muted-foreground">Clean record.</p> : (
              <ul className="divide-y">
                {d.reports_against.map((r) => (
                  <li key={r.id} className="py-2.5">
                    <Link href={`/admin/reports${r.status === "open" || r.status === "reviewing" ? "" : `?status=${r.status}`}#${r.id}`} className="block hover:opacity-80">
                      <span className="flex flex-wrap items-center gap-2 text-body-sm font-medium">{reasonLabel(r.reason)} <StatusPill status={r.status === "actioned" ? "completed" : r.status === "dismissed" ? "neutral" : "pending"}>{r.status}</StatusPill></span>
                      <span className="block text-caption text-muted-foreground">by {r.reporter} · {fmt(r.created_at)}</span>
                      {r.details ? <span className="block text-caption">“{r.details}”</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {d.reports_filed.length ? <p className="mt-3 text-caption text-muted-foreground">Filed {d.reports_filed.length} reports about others.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent EMR posts</CardTitle></CardHeader>
          <CardContent>
            {d.recent_posts.length === 0 ? <p className="text-body-sm text-muted-foreground">No posts.</p> : (
              <ul className="divide-y">
                {d.recent_posts.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 py-2.5">
                    <Link href={`/emr/${e.id}`} className="min-w-0 flex-1 text-body-sm hover:underline">
                      {e.parent_id ? <span className="text-caption text-muted-foreground">Reply · </span> : null}
                      {e.body || "[photo]"}{e.images ? ` (${e.images} photo${e.images > 1 ? "s" : ""})` : ""}
                    </Link>
                    <RpcButton fn="admin_delete_emr_post" args={{ p_post: e.id, p_reason: "Removed by moderator" }} label="Delete" done="Post removed." size="sm" variant="ghost" confirm="Delete this post for everyone?" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Moderation history</CardTitle></CardHeader>
          <CardContent>
            {d.admin_log.length === 0 ? <p className="text-body-sm text-muted-foreground">No admin actions yet.</p> : (
              <ul className="space-y-2 text-body-sm">
                {d.admin_log.map((a, i) => (
                  <li key={i}><span className="font-medium">{a.action.replaceAll("_", " ")}</span> <span className="text-caption text-muted-foreground">by {a.admin} · {fmt(a.created_at)}</span></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </BlurFade>
  );
}
