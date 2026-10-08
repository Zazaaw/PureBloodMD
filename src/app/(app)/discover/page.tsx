import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import type { Profile } from "@/lib/types";
import { DiscoverClient } from "./discover-client";

export const metadata: Metadata = { title: "Triage" };

export default async function DiscoverPage() {
  const { supabase, profile } = await requireProfile();
  const [{ data }, { data: hasLocation }, { data: quota }, { data: rewind }] = await Promise.all([
    supabase.rpc("get_candidates", { p_country: profile.country ?? "ID" }),
    supabase.rpc("has_my_location"),
    supabase.rpc("superlike_quota"),
    supabase.rpc("rewind_quota"),
  ]);
  const r = (rewind as { used: number; quota: number | null }[] | null)?.[0];
  const q = (quota as { used: number; quota: number; next_at: string | null }[] | null)?.[0];
  return (
    <DiscoverClient
      me={profile}
      initialCandidates={(data ?? []) as Profile[]}
      hasLocation={Boolean(hasLocation)}
      superQuota={q ?? { used: 0, quota: profile.is_vip ? 5 : 1, next_at: null }}
      rewindQuota={r ?? { used: 0, quota: profile.is_vip ? null : 1 }}
    />
  );
}
