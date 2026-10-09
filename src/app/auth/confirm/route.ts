import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Target of the branded confirmation email:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 * Unlike the PKCE ?code= link, a token_hash works even when the email is
 * opened on a different device or browser than the one used to sign up.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  const next = searchParams.get("next") ?? (type === "recovery" ? "/passport" : "/onboarding");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Sign-up confirmations get a welcome screen first; other links go straight on.
      const target = type === "email" || type === "signup" ? "/welcome" : safeNext;
      return NextResponse.redirect(`${origin}${target}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?link=expired`);
}
