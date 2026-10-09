"use client";

import { useState } from "react";
import { SealCheck } from "@phosphor-icons/react";
import { FounderBadge } from "@/components/founder-badge";
import { DoctorPhoto } from "@/components/doctor-photo";
import PillTabs from "@/components/ui/pill-tabs";
import { PASSPORT_TABS, type PassportTab } from "./tabs";

/**
 * Passport layout: who you are, then one
 * tab per job. Panels stay mounted (just hidden) so unsaved edits survive a
 * tab switch; the active tab is mirrored in ?tab= for deep links.
 */
export function PassportShell({
  tabs = PASSPORT_TABS,
  initialTab,
  me,
  panels,
}: {
  /** Tabs to show (VIP is hidden while the program is switched off). */
  tabs?: readonly PassportTab[];
  initialTab: PassportTab;
  me: { name: string; photo: string; subtitle: string; verified: boolean; founder?: boolean };
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


  return (
    <>
      <section className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex min-w-0 items-center gap-4">
          <DoctorPhoto src={me.photo} alt={me.name} size={64} className="size-16 shrink-0 ring-2 ring-border" />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-h5 font-semibold leading-tight">
              {me.name}
              {me.verified ? <SealCheck weight="fill" aria-label="Verified" className="size-5 text-sky-500" /> : null}
              {me.founder ? <FounderBadge /> : null}
            </p>
            <p className="mt-0.5 text-body-sm text-muted-foreground">{me.subtitle}</p>
          </div>
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
