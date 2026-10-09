import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import type { Profile } from "@/lib/types";
import { DiscoverClient } from "./discover-client";

export const metadata: Metadata = { title: "Triage" };

export default async function DiscoverPage() {
  const { supabase, profile, flags } = await requireProfile();
  const [{ data }, { data: hasLocation }, { data: quota }, { data: rewind }, { data: swipes }] = await Promise.all([
    supabase.rpc("get_candidates", { p_country: profile.country ?? "ID" }),
    supabase.rpc("has_my_location"),
    supabase.rpc("superlike_quota"),
    supabase.rpc("rewind_quota"),
    supabase.rpc("swipe_quota"),
  ]);
  const s = (swipes as { used: number; quota: number | null; next_at: string | null }[] | null)?.[0];
  const r = (rewind as { used: number; quota: number | null }[] | null)?.[0];
  const q = (quota as { used: number; quota: number; next_at: string | null }[] | null)?.[0];
  return (
    <DiscoverClient
      me={profile}
      initialCandidates={(data ?? []) as Profile[]}
      hasLocation={Boolean(hasLocation)}
      superQuota={q ?? { used: 0, quota: profile.is_vip ? 5 : 1, next_at: null }}
      rewindQuota={r ?? { used: 0, quota: profile.is_vip ? null : 1 }}
      swipeQuota={s ?? { used: 0, quota: profile.is_vip ? null : flags.dailySwipeLimit, next_at: null }}
      vipEnabled={flags.vipEnabled}
      activeCountries={flags.activeCountries}
    />
  );
}
