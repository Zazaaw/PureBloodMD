import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FilePdf } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { DoctorPhoto } from "@/components/doctor-photo";
import { StatusPill } from "@/components/status-pill";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ReviewActions } from "./review-actions";

export const metadata: Metadata = { title: "Verification desk" };

type Row = {
  id: string; status: "pending" | "approved" | "rejected"; created_at: string; reviewed_at: string | null; reviewer_note: string | null;
  id_doc_path: string; selfie_path: string; license_path: string;
  profile_id: string; display_name: string; photo_url: string; specialty_title: string; hospital: string; email: string | null;
  str_number: string | null; alma_mater: string | null; class_year: number | null;
};

const STATUSES = ["pending", "approved", "rejected"] as const;
const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Developer dashboard: check ID + license, then approve (blue badge + email) or reject with a note (email). */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase } = await requireProfile();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const { status: raw } = await searchParams;
  const status = STATUSES.find((s) => s === raw) ?? "pending";
  const [{ data }, { data: pendingRows }] = await Promise.all([
    supabase.rpc("admin_list_verifications", { p_status: status }),
    status === "pending" ? Promise.resolve({ data: null }) : supabase.rpc("admin_list_verifications", { p_status: "pending" }),
  ]);
  const rows = (data ?? []) as Row[];
  const pendingCount = status === "pending" ? rows.length : ((pendingRows ?? []) as Row[]).length;

  // Private bucket: short-lived signed links, readable only because this session is an admin.
  const paths = rows.flatMap((r) => [r.id_doc_path, r.selfie_path, r.license_path]);
  const { data: signed } = paths.length
    ? await supabase.storage.from("verification-docs").createSignedUrls(paths, 600)
    : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl ?? undefined]));

  return (
    <main className="pb-dock mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:pb-10">
      <BlurFade>
        <PageHeader
          title="Verification desk"
          subtitle="Check that the ID, the selfie and the medical license belong to the same real doctor. Approving adds the blue badge and emails them."
        />

        <nav aria-label="Status" className="mb-6 flex w-full items-center overflow-x-auto rounded-full border bg-card p-1 shadow-sm md:w-fit">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={s === "pending" ? "/admin" : `/admin?status=${s}`}
              aria-current={s === status ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-medium capitalize transition-all duration-300",
                s === status ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
              {s === "pending" && pendingCount ? <span className="ml-1.5 tabular-nums">({pendingCount})</span> : null}
            </Link>
          ))}
        </nav>

        {rows.length === 0 ? (
          <div className="rounded-xl border py-16 text-center">
            <p className="font-semibold">{status === "pending" ? "Inbox zero. The ward is quiet." : `No ${status} requests yet.`}</p>
            <p className="mt-1 text-body-sm text-muted-foreground">New submissions show up here, oldest first.</p>
          </div>
        ) : (
          <ul className="space-y-5">
            {rows.map((r, i) => (
              <li key={r.id}>
                <BlurFade inView delay={Math.min(i, 6) * 0.05}>
                  <Card>
                    <CardContent className="space-y-5 p-5 sm:p-6">
                      <div className="flex flex-wrap items-start gap-4">
                        <DoctorPhoto src={r.photo_url} alt="" size={56} className="size-14 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-tight">{r.display_name}</p>
                          <p className="text-body-sm text-muted-foreground">{r.specialty_title} · {r.hospital}</p>
                          <p className="text-body-sm break-all">{r.email ?? "No email"}</p>
                        </div>
                        <div className="text-right">
                          <StatusPill status={r.status === "approved" ? "completed" : r.status === "rejected" ? "cancelled" : "pending"}>{r.status}</StatusPill>
                          <p className="mt-1 text-caption text-muted-foreground tabular-nums">Sent {fmt(r.created_at)}</p>
                        </div>
                      </div>

                      <dl className="grid gap-2 rounded-lg border border-dashed p-3 font-mono text-caption sm:grid-cols-3">
                        <div><dt className="text-muted-foreground">STR / NIM</dt><dd>{r.str_number ?? "Not given"}</dd></div>
                        <div><dt className="text-muted-foreground">ALMA MATER</dt><dd>{r.alma_mater ?? "Not given"}</dd></div>
                        <div><dt className="text-muted-foreground">CLASS OF</dt><dd>{r.class_year ?? "Not given"}</dd></div>
                      </dl>

                      <div className="grid grid-cols-3 gap-3">
                        {([["ID card", r.id_doc_path], ["Selfie with ID", r.selfie_path], ["License", r.license_path]] as const).map(([label, path]) => {
                          const href = urlFor.get(path);
                          const pdf = path.toLowerCase().endsWith(".pdf");
                          return (
                            <figure key={label} className="min-w-0">
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="block aspect-[4/3] overflow-hidden rounded-lg border bg-muted transition-opacity duration-200 hover:opacity-90"
                              >
                                {href && !pdf ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                                  <img src={href} alt={`${label} of ${r.display_name}`} className="size-full object-cover" />
                                ) : (
                                  <span className="grid size-full place-items-center text-muted-foreground">
                                    <FilePdf className="size-8" />
                                  </span>
                                )}
                              </a>
                              <figcaption className="mt-1 text-caption text-muted-foreground">{label}</figcaption>
                            </figure>
                          );
                        })}
                      </div>

                      {r.status === "pending" ? (
                        <ReviewActions id={r.id} name={r.display_name} />
                      ) : (
                        <p className="text-body-sm text-muted-foreground">
                          {r.status === "approved" ? "Approved" : "Rejected"}
                          {r.reviewed_at ? ` ${fmt(r.reviewed_at)}` : ""}
                          {r.reviewer_note ? `: “${r.reviewer_note}”` : "."}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </BlurFade>
              </li>
            ))}
          </ul>
        )}
      </BlurFade>
    </main>
  );
}
