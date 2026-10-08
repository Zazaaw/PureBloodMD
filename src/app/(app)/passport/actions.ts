"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/env";
import { parseProfile } from "../../onboarding/validate";

export type PassportState = { errors?: Record<string, string>; error?: string; saved?: boolean };

export async function updatePassport(_: PassportState, fd: FormData): Promise<PassportState> {
  const { supabase, profile, userId } = await requireProfile();
  const { data, errors } = parseProfile(fd, getSupabaseEnv()!.url);
  if (Object.keys(errors).length) return { errors };
  const kept = new Set([profile.photo_url, ...(profile.gallery ?? [])]);
  if (![data.photo_url, ...data.gallery].every((u) => kept.has(u) || u.includes(`/avatars/${userId}/`))) {
    return { errors: { photo_url: "Upload your own photos." } };
  }

  // Gender is not updatable (column grant): it drives the Bumble protocol.
  const { gender: _gender, ...editable } = data;
  void _gender;
  const { error } = await supabase.from("profiles").update(editable).eq("id", profile.id);
  if (error) return { error: "Could not save. The chart is locked, try again." };

  revalidatePath("/", "layout");
  return { saved: true };
}

export type CredentialsState = { errors?: Record<string, string>; error?: string; saved?: boolean };

/** Private STR / alma mater / class year, edited from the Verification tab. */
export async function updateCredentials(_: CredentialsState, fd: FormData): Promise<CredentialsState> {
  const { supabase, profile } = await requireProfile();
  const str = String(fd.get("str_number") ?? "").trim().toUpperCase();
  const alma = String(fd.get("alma_mater") ?? "").trim();
  const classYear = Number(fd.get("class_year"));
  const errors: Record<string, string> = {};
  if (!/^[A-Z0-9-]{6,32}$/.test(str)) errors.str_number = "6 to 32 letters, digits or dashes.";
  if (alma.length < 2) errors.alma_mater = "Which faculty raised you?";
  if (!Number.isInteger(classYear) || classYear < 1970 || classYear > 2035) errors.class_year = "A year between 1970 and 2035.";
  if (Object.keys(errors).length) return { errors };

  const { error } = await supabase
    .from("credentials")
    .upsert({ profile_id: profile.id, str_number: str, alma_mater: alma, class_year: classYear });
  if (error) return { error: "Could not save your credentials. Try again." };
  revalidatePath("/passport");
  return { saved: true };
}
