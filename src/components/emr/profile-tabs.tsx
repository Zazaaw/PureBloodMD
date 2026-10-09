"use client";

import { usePathname, useRouter } from "next/navigation";
import PillTabs from "@/components/ui/pill-tabs";

export const PROFILE_TABS = ["Threads", "Replies", "Photos"] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

/** Kit PillTabs driving ?tab=, so each tab is a shareable, server-rendered URL. */
export function ProfileTabs({ value }: { value: ProfileTab }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <PillTabs
      tabs={PROFILE_TABS}
      value={value}
      onChange={(tab) => router.replace(tab === "Threads" ? pathname : `${pathname}?tab=${tab.toLowerCase()}`, { scroll: false })}
    />
  );
}
