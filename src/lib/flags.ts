import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Launch switches, stored in the database (public.app_config) so the UI and the
 * rules enforced by Postgres always agree. Flip them in SQL, no redeploy needed:
 *   update public.app_config set value = 'true' where key = 'vip_enabled';
 */
export type AppFlags = { vipEnabled: boolean; dailySwipeLimit: number; activeCountries: string[] };

const FALLBACK: AppFlags = { vipEnabled: false, dailySwipeLimit: 20, activeCountries: ["ID"] };

export const getAppFlags = cache(async (): Promise<AppFlags> => {
  let data: unknown = null;
  try {
    const supabase = await createClient();
    ({ data } = await supabase.rpc("get_app_flags"));
  } catch {
    return FALLBACK; // Supabase not configured yet (setup notice)
  }
  const f = data as { vip_enabled?: boolean; daily_swipe_limit?: number; active_countries?: string[] } | null;
  if (!f) return FALLBACK;
  return {
    vipEnabled: Boolean(f.vip_enabled),
    dailySwipeLimit: Number(f.daily_swipe_limit ?? FALLBACK.dailySwipeLimit),
    activeCountries: f.active_countries?.length ? f.active_countries : FALLBACK.activeCountries,
  };
});
