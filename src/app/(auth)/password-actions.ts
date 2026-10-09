"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResetState = { error?: string; notice?: string; email?: string };

/** Step 1: email a reset link. Same answer whether or not the account exists. */
export async function requestPasswordReset(_: ResetState, fd: FormData): Promise<ResetState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", email };

  const hdrs = await headers();

  const origin = hdrs.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3333";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("security purposes") || msg.includes("rate limit")) {
      return { email, error: "A reset link was sent very recently. Wait a minute, then try again." };
    }
    // Don't reveal whether the email exists; fall through to the same notice.
  }
  return { email, notice: "If that email has a passport, a reset link is on its way. It works once, for 1 hour." };
}

export type NewPasswordState = { error?: string };

/** Step 2 (after the email link signed them in): set the new password. */
export async function setNewPassword(_: NewPasswordState, fd: FormData): Promise<NewPasswordState> {
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "Password needs at least 8 characters." };
  if (fd.get("password_confirm") !== password) return { error: "Passwords don't match. Check for a typo." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const msg = error.message.toLowerCase();
    return {
      error: msg.includes("different from the old")
        ? "That's your old password. Pick a new one."
        : msg.includes("session") || msg.includes("not authenticated")
          ? "This reset link expired. Request a new one."
          : "Could not update your password. Try again.",
    };
  }
  redirect("/discover?password=updated");
}
