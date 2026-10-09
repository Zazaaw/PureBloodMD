import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { DotPattern } from "@/components/effects/dot-pattern";
import { FounderBadge } from "@/components/founder-badge";
import { cn } from "@/lib/utils";

const ECG = "M0 70 H220 l14 -34 l18 70 l16 -80 l14 44 H520 l12 -26 l14 52 l14 -62 l12 36 H900 l14 -34 l18 70 l16 -80 l14 44 H1400";

/** A monitor trace sweeping across a banner (decorative). */
function EcgTrace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1400 140" preserveAspectRatio="none" aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full", className)}>
      <path d={ECG} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="2" />
      <path d={ECG} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="260 1140" className="animate-ecg-long" />
    </svg>
  );
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(new Date()));
  return h < 5 ? "Night shift, still up" : h < 11 ? "Good morning" : h < 15 ? "Good afternoon" : h < 19 ? "Good evening" : "Good night";
}

type Queue = { href: string; label: string; n: number };

/** Overview banner: who is on call, what needs a human today, and the ward pulse. */
export function AdminHero({
  name,
  founder,
  queues,
  pulse,
}: {
  name: string;
  founder: boolean;
  queues: Queue[];
  pulse: { label: string; value: number | string }[];
}) {
  const waiting = queues.reduce((n, q) => n + q.n, 0);
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" }).format(new Date());
  const firstName = name.replace(/^dr\.?\s*/i, "").split(/[ ,]/)[0];

  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-sm sm:p-8">
      <DotPattern width={18} height={18} cr={1} className="-z-10 text-white/10 [mask-image:radial-gradient(ellipse_at_top_left,white,transparent_70%)]" />
      <span aria-hidden className="absolute -right-24 -top-24 -z-10 size-96 rounded-full bg-primary/30 blur-3xl" />
      <span aria-hidden className="absolute -bottom-32 left-1/3 -z-10 size-80 rounded-full bg-primary/10 blur-3xl" />
      <EcgTrace className="-z-10 text-primary" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end">
        <div>
          <p className="text-overline font-semibold uppercase tracking-widest text-white/50" suppressHydrationWarning>Admin · {today}</p>
          <h1 className="mt-3 flex flex-wrap items-center gap-3 text-h3 font-bold leading-tight">
            <span suppressHydrationWarning>{greeting()}, Dr. {firstName}.</span>
            {founder ? <FounderBadge variant="overlay" /> : null}
          </h1>
          <p className="mt-3 max-w-xl text-lead text-white/70">
            {waiting === 0 ? (
              <>All quiet on the ward. Nothing is waiting for a human right now.</>
            ) : (
              <>
                <span className="font-semibold text-white">{waiting} {waiting === 1 ? "thing needs" : "things need"} a human</span> today. Triage them before your coffee goes cold.
              </>
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {queues.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-body-sm font-medium backdrop-blur transition-colors duration-200",
                  q.n ? "border-primary/50 bg-primary/20 text-white hover:bg-primary/30" : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                )}
              >
                <span className="font-mono font-bold tabular-nums">{q.n}</span> {q.label}
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 font-mono backdrop-blur">
          <p className="flex items-center gap-2 text-overline font-semibold uppercase tracking-widest text-white/60">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Ward pulse
          </p>
          <dl className="mt-3 space-y-2">
            {pulse.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-caption uppercase text-white/50">{row.label}</dt>
                <dd className="text-lead font-bold tabular-nums text-emerald-300">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/** Smaller banner on each admin section: icon, title, one line, a few numbers. */
export function SectionHero({
  icon,
  eyebrow,
  title,
  subtitle,
  chips = [],
  action,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  chips?: { label: string; value: number | string; tone?: "alert" | "ok" | "muted" }[];
  action?: React.ReactNode;
}) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <DotPattern width={18} height={18} cr={1} className="text-foreground/[0.06] [mask-image:linear-gradient(to_left,white,transparent_60%)]" />
      <span aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-wrap items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-linear-to-br from-primary to-primary/70 text-primary-foreground shadow-sm [&_svg]:size-6">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-overline font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
          <h1 className="text-h4 font-bold leading-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">{subtitle}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {chips.length ? (
        <div className="relative mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c.label}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-caption font-medium",
                c.tone === "alert" ? "border-primary/30 bg-primary/10 text-primary" : c.tone === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted/60 text-muted-foreground"
              )}
            >
              <span className="font-mono font-bold tabular-nums">{c.value}</span> {c.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
