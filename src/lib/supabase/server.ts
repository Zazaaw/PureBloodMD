import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";

/** Supabase client for Server Components, Server Actions and Route Handlers. */
export async function createClient() {
  // Read cookies first: it marks the route as dynamic even when env is missing.
  const cookieStore = await cookies();
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase env is missing. See README: Setup Supabase.");

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // proxy.ts refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
