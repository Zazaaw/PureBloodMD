import type { Metadata } from "next";
import Link from "next/link";
import { MagnifyingGlass, SealCheck, Users } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { DoctorPhoto } from "@/components/doctor-photo";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireProfile } from "@/lib/auth";
import { SectionHero } from "../hero";
import { countryName } from "@/lib/constants";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

type Row = {
  id: string; display_name: string; photo_url: string; specialty_title: string; hospital: string; country: string; intent: string; gender: string;
  email: string | null; created_at: string; last_sign_in_at: string | null; verified: boolean;
  banned_at: string | null; deactivated_at: string | null; reports_against: number; total: number;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unverified", label: "Unverified" },
  { key: "verified", label: "Verified" },
  { key: "reported", label: "Reported" },
  { key: "banned", label: "Banned" },
  { key: "paused", label: "Paused" },
] as const;
const PAGE = 50;
const ago = (d: string) => {
  const t = timeAgo(d);
  return /\d[mhd]$/.test(t) ? `${t} ago` : t === "now" ? "just now" : `on ${t}`;
};

/** Every real member (bots excluded): search, filter, open one to act. */
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; page?: string }> }) {
  const { supabase } = await requireProfile();
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const filter = FILTERS.find((f) => f.key === sp.filter)?.key ?? "all";
  const page = Math.max(0, Number(sp.page ?? 0) || 0);
  const { data } = await supabase.rpc("admin_list_users", { p_query: q, p_filter: filter, p_limit: PAGE, p_offset: page * PAGE });
  const rows = (data ?? []) as Row[];
  const total = Number(rows[0]?.total ?? 0);
  const link = (o: { q?: string; filter?: string; page?: number }) => {
    const p = new URLSearchParams();
    const qq = o.q ?? q, ff = o.filter ?? filter, pg = o.page ?? 0;
    if (qq) p.set("q", qq);
    if (ff !== "all") p.set("filter", ff);
    if (pg) p.set("page", String(pg));
    return `/admin/users${p.size ? `?${p}` : ""}`;
  };

  return (
    <BlurFade>
      <SectionHero
        icon={<Users weight="fill" />}
        eyebrow="Members"
        title="Users"
        subtitle={`Every real member (demo bots are hidden). Search, filter, open one to ban, unban or manage the badge.${q ? ` Matching “${q}”.` : ""}`}
        chips={[{ label: filter === "all" ? "members" : filter, value: total.toLocaleString("id-ID"), tone: filter === "banned" || filter === "reported" ? "alert" : "muted" }]}
      />

      <form action="/admin/users" className="mb-4 flex gap-2">
        {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
        <div className="relative flex-1">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search name, email or hospital" className="pl-9" aria-label="Search users" />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <nav aria-label="Filter" className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={link({ filter: f.key, page: 0 })}
            aria-current={f.key === filter ? "page" : undefined}
            className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-body-sm font-medium transition-colors", f.key === filter ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground")}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="rounded-xl border py-16 text-center"><p className="font-semibold">No members found.</p></div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card shadow-sm">
          {rows.map((u) => (
            <li key={u.id}>
              <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-accent sm:px-5">
                <DoctorPhoto src={u.photo_url} alt="" size={44} className="size-11 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-body-sm font-semibold">{u.display_name}</span>
                    {u.verified ? <SealCheck weight="fill" className="size-4 text-sky-500" aria-label="Verified" /> : null}
                  </span>
                  <span className="block text-caption text-muted-foreground">{u.email ?? "no email"} · {u.specialty_title} · {countryName(u.country)} · {u.intent}</span>
                  <span className="block text-caption text-muted-foreground" suppressHydrationWarning>
                    Joined {ago(u.created_at)} · last seen {u.last_sign_in_at ? ago(u.last_sign_in_at) : "never"}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {u.banned_at ? <StatusPill status="cancelled">Banned</StatusPill> : u.deactivated_at ? <StatusPill status="neutral">Paused</StatusPill> : null}
                  {u.reports_against ? <StatusPill status="pending">{u.reports_against} reports</StatusPill> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total > PAGE ? (
        <div className="mt-5 flex items-center justify-between text-body-sm">
          {page > 0 ? <Button variant="outline" asChild><Link href={link({ page: page - 1 })}>Previous</Link></Button> : <span />}
          <span className="text-muted-foreground tabular-nums">Page {page + 1} of {Math.ceil(total / PAGE)}</span>
          {(page + 1) * PAGE < total ? <Button variant="outline" asChild><Link href={link({ page: page + 1 })}>Next</Link></Button> : <span />}
        </div>
      ) : null}
    </BlurFade>
  );
}
