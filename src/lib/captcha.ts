import "server-only";

/** True when Supabase itself checks the CAPTCHA (Auth > Attack Protection). */
export const captchaBySupabase = () => process.env.SUPABASE_AUTH_CAPTCHA === "on";

/**
 * Verifies a Cloudflare Turnstile token on our server.
 * Tokens are single-use, so never verify here AND forward to Supabase.
 */
export async function verifyCaptcha(token: string, ip?: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: "CAPTCHA is not configured on the server." };
  if (!token) return { ok: false, reason: "Complete the CAPTCHA first." };

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (data.success) return { ok: true as const };
    const expired = data["error-codes"]?.some((c) => c === "timeout-or-duplicate");
    return { ok: false, reason: expired ? "The CAPTCHA expired. Please try again." : "CAPTCHA check failed. Please try again." };
  } catch {
    return { ok: false, reason: "Could not reach the CAPTCHA service. Try again in a moment." };
  }
}
