"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { captchaBySupabase, verifyCaptcha } from "@/lib/captcha";
import { TERMS_VERSION } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string; email?: string };

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", email };
  if (password.length < 8) return { error: "Password needs at least 8 characters.", email };
  return { email, password };
}

const captchaToken = (fd: FormData) => String(fd.get("cf-turnstile-response") ?? "");

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const creds = readCredentials(formData);
  if ("error" in creds) return creds;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    ...creds,
    options: captchaBySupabase() ? { captchaToken: captchaToken(formData) } : undefined,
  });
  if (error) {
    return {
      email: creds.email,
      error: error.message.includes("Email not confirmed")
        ? "Confirm your email first. Check your inbox for the link."
        : error.message.toLowerCase().includes("captcha")
          ? "Complete the CAPTCHA first."
          : "Wrong email or password. Even residents get this one wrong.",
    };
  }
  redirect("/discover");
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const creds = readCredentials(formData);
  if ("error" in creds) return creds;

  // Consent is checked on the server too: a disabled checkbox is not a contract.
  if (formData.get("agree_terms") !== "on" || formData.get("confirm_age") !== "on") {
    return { email: creds.email, error: "Please accept the Terms and confirm you are 21 or older." };
  }

  const hdrs = await headers();
  const token = captchaToken(formData);
  if (!captchaBySupabase()) {
    const check = await verifyCaptcha(token, hdrs.get("cf-connecting-ip") ?? hdrs.get("x-forwarded-for")?.split(",")[0]);
    if (!check.ok) return { email: creds.email, error: check.reason };
  }

  const origin = hdrs.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3333";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...creds,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      captchaToken: captchaBySupabase() ? token : undefined,
      // Proof of consent, stored on the auth user.
      data: { terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString(), age_confirmed_21: true },
    },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    return {
      email: creds.email,
      error: msg.includes("rate limit")
        ? "Too many sign-ups right now, our email desk is on a break. Try again in an hour."
        : msg.includes("already registered")
          ? "That email already has a passport. Sign in instead."
          : error.message,
    };
  }

  if (data.session) redirect("/onboarding");
  return {
    email: creds.email,
    notice: "We sent a confirmation email. Open it and tap “Confirm my email” to build your passport.",
  };
}
