"use client";

import { useState } from "react";
import { CaretRight, Crown, Images, SealCheck } from "@phosphor-icons/react";
import { DoctorPhoto } from "@/components/doctor-photo";
import PillTabs from "@/components/ui/pill-tabs";
import { cn } from "@/lib/utils";
import { PASSPORT_TABS, type PassportTab, type Tile } from "./tabs";

/**
 * Passport layout: who you are + three status tiles above the fold, then one
 * tab per job. Panels stay mounted (just hidden) so unsaved edits survive a
 * tab switch; the active tab is mirrored in ?tab= for deep links.
 */
export function PassportShell({
  tabs = PASSPORT_TABS,
  initialTab,
  me,
  status,
  panels,
}: {
  /** Tabs to show (VIP is hidden while the program is switched off). */
  tabs?: readonly PassportTab[];
  initialTab: PassportTab;
  me: { name: string; photo: string; subtitle: string; verified: boolean };
  status: { verification: Tile; vip: Tile; photos: Tile };
  panels: Record<PassportTab, React.ReactNode>;
}) {
  const [tab, setTab] = useState<PassportTab>(initialTab);

  function go(next: PassportTab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "Profile") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next.toLowerCase());
    window.history.replaceState(null, "", url);
  }

  const icons: Record<string, typeof SealCheck> = { Badge: SealCheck, Plan: Crown, Photos: Images };

  return (
    <>
      <section className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4 lg:w-80 lg:shrink-0">
          <DoctorPhoto src={me.photo} alt={me.name} size={64} className="size-16 shrink-0 ring-2 ring-border" />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-h5 font-semibold leading-tight">
              {me.name}
              {me.verified ? <SealCheck weight="fill" aria-label="Verified" className="size-5 text-sky-500" /> : null}
            </p>
            <p className="mt-0.5 text-body-sm text-muted-foreground">{me.subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:flex-1">
          {[status.verification, status.vip, status.photos].map((t) => {
            const Icon = icons[t.label] ?? SealCheck;
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => go(t.tab)}
                className="group flex min-w-0 flex-col items-start gap-1.5 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex w-full items-center justify-between gap-1">
                  <Icon
                    weight="fill"
                    className={cn(
                      "size-5 shrink-0",
                      t.tone === "done" ? "text-emerald-500" : t.tone === "warn" ? "text-amber-500" : "text-muted-foreground"
                    )}
                  />
                  <CaretRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="text-overline font-semibold uppercase text-muted-foreground">{t.label}</span>
                <span className="text-body-sm font-semibold leading-tight">{t.value}</span>
                <span className="hidden text-caption text-muted-foreground sm:block">{t.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="sticky top-0 z-30 -mx-4 mt-6 bg-background/85 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div role="tablist" aria-label="Passport sections">
          <PillTabs tabs={tabs} value={tab} onChange={(t) => go(t as PassportTab)} />
        </div>
      </div>

      {tabs.map((t) => (
        <div key={t} role="tabpanel" aria-label={t} hidden={tab !== t} className="mt-4">
          {panels[t]}
        </div>
      ))}
    </>
  );
}
