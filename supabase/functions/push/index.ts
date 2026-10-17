// Sends web push notifications. Called only by the database (public.send_push, 0026)
// with the subscriptions and the payload; protected by a shared secret, not a JWT.
// Dead subscriptions (404/410 from the push service) are deleted.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

type Sub = { endpoint: string; p256dh: string; auth: string };

const SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
webpush.setVapidDetails(
  "https://www.purebloodmd.com",
  Deno.env.get("VAPID_PUBLIC_KEY") ?? "",
  Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
);
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  if (req.method !== "POST" || !SECRET || req.headers.get("x-push-secret") !== SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  const { subs, payload } = (await req.json()) as { subs: Sub[]; payload: Record<string, unknown> };
  if (!Array.isArray(subs) || !subs.length) return Response.json({ sent: 0, gone: 0 });

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
        TTL: 60 * 60 * 24,
        urgency: "high",
      })
    ),
  );
  const gone = subs
    .filter((_, i) => {
      const r = results[i];
      return r.status === "rejected" && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0);
    })
    .map((s) => s.endpoint);
  if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);

  const failed = results.filter((r) => r.status === "rejected").length - gone.length;
  if (failed) console.warn(`push: ${failed} failed`, results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason)).slice(0, 3));
  return Response.json({ sent: results.filter((r) => r.status === "fulfilled").length, gone: gone.length, failed });
});
