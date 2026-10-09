"use server";

import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAppFlags } from "@/lib/flags";
import { parseProfile } from "./validate";

export type OnboardingState = { errors?: Record<string, string>; error?: string; values?: Record<string, string> };

export async function createPassport(_: OnboardingState, fd: FormData): Promise<OnboardingState> {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const env = getSupabaseEnv()!;

  const { data, errors } = parseProfile(fd, env.url, (await getAppFlags()).activeCountries);
  const str = String(fd.get("str_number") ?? "").trim().toUpperCase();
  const alma = String(fd.get("alma_mater") ?? "").trim();
  const classYear = Number(fd.get("class_year"));
  if (!/^[A-Z0-9-]{6,32}$/.test(str)) errors.str_number = "6 to 32 letters, digits or dashes.";
  if (alma.length < 2) errors.alma_mater = "Which FK raised you?";
  if (!Number.isInteger(classYear) || classYear < 1970 || classYear > 2035) errors.class_year = "A year between 1970 and 2035.";
  const values = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
  if (Object.keys(errors).length) return { errors, values };

  // Photos live in the user's own folder; anything else is rejected.
  if (![data.photo_url, ...data.gallery].every((u) => u.includes(`/avatars/${userId}/`))) {
    return { errors: { photo_url: "Upload your own photos." }, values };
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({ ...data, user_id: userId })
    .select("id")
    .single();
  if (error) {
    return { error: error.code === "23505" ? "You already have a passport." : "Could not save your passport. Try again.", values };
  }

  const { error: credErr } = await supabase
    .from("credentials")
    .insert({ profile_id: profile.id, str_number: str, alma_mater: alma, class_year: classYear });
  if (credErr) return { error: "Passport saved, but the STR record failed. Edit it later in Passport." };

  // A few featured doctors are already waiting in Consults.
  await supabase.rpc("seed_starter_matches");
  redirect("/discover");
}
