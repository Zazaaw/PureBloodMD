import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Subscription } from "@/lib/types";

/** Verified user id from the JWT (getClaims validates the signature). */
export const getUserId = cache(async () => {
  await cookies();
  if (!getSupabaseEnv()) return null; // login page shows the setup notice
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

/** Signed-in doctor with a finished profile, or a redirect to the right step. */
export const requireProfile = cache(async () => {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<Profile>();

  if (!profile) redirect("/onboarding");

  // VIP comes from the subscription (period end), not a stored flag.
  const { data: subs } = await supabase.rpc("get_my_subscription");
  const subscription = ((subs ?? []) as Subscription[])[0] ?? null;
  profile.is_vip = Boolean(subscription?.active);

  return { supabase, userId, profile, subscription };
});
