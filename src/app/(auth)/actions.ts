"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { captchaBySupabase, verifyCaptcha } from "@/lib/captcha";
import { getAppFlags } from "@/lib/flags";
import { TERMS_VERSION } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string; email?: string; country?: string; intent?: "romance" | "connect"; unconfirmed?: boolean };

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", email };
  if (password.length < 8) return { error: "Password needs at least 8 characters.", email };
  return { email, password };
}

const captchaToken = (fd: FormData) => String(fd.get("cf-turnstile-response") ?? "");

export async function signIn(state: AuthState, formData: FormData): Promise<AuthState> {
  if (formData.get("intent") === "resend") return resendConfirmation(formData);
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
      unconfirmed: error.message.includes("Email not confirmed"),
      error: error.message.toLowerCase().includes("banned")
        ? "This account is suspended. If you think this is a mistake, email safety@purebloodmd.com."
        : error.message.includes("Email not confirmed")
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

  const country = String(formData.get("country") ?? "");
  const intent: "romance" | "connect" = formData.get("intent") === "connect" ? "connect" : "romance";
  const back = { email: creds.email, country, intent };
  if (formData.get("password_confirm") !== creds.password) {
    return { ...back, error: "Passwords don't match. Check for a typo." };
  }
  const { activeCountries } = await getAppFlags();
  if (!activeCountries.includes(country)) return { ...back, error: "PureBloodMD is open in Indonesia only for now." };

  // Consent is checked on the server too: a disabled checkbox is not a contract.
  if (formData.get("agree_terms") !== "on" || formData.get("confirm_age") !== "on") {
    return { ...back, error: "Please accept the Terms and confirm you are 21 or older." };
  }

  const hdrs = await headers();
  const token = captchaToken(formData);
  if (!captchaBySupabase()) {
    const check = await verifyCaptcha(token, hdrs.get("cf-connecting-ip") ?? hdrs.get("x-forwarded-for")?.split(",")[0]);
    if (!check.ok) return { ...back, error: check.reason };
  }

  const origin = hdrs.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3333";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...creds,
    options: {
      // The email button appends &token_hash=...; /auth/confirm verifies it on this same site.
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
      captchaToken: captchaBySupabase() ? token : undefined,
      // Proof of consent, stored on the auth user.
      data: { terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString(), age_confirmed_21: true, country, intent },
    },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    return {
      ...back,
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

/** "Email not confirmed" on sign-in: send a fresh confirmation link to that address. */
async function resendConfirmation(formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", email };
  const hdrs = await headers();
  const origin = hdrs.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3333";
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
      captchaToken: captchaBySupabase() ? captchaToken(formData) : undefined,
    },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    return {
      email,
      unconfirmed: true,
      error: msg.includes("security purposes") || msg.includes("rate limit")
        ? "A link was sent very recently. Wait a minute, then try again."
        : "Could not send a new link. Try again in a minute.",
    };
  }
  return { email, notice: "We sent a fresh confirmation link. The old one no longer matters." };
}
