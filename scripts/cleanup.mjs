// Removes chat photos whose messages were deleted (unmatch, delete chat, 30-day expiry).
// Storage files can only be deleted through the Storage API, so the database queues
// their paths in `media_trash` and this script empties it. Usage: npm run db:cleanup
// In production, run it on a schedule (e.g. a daily cron job).
import { readFileSync, existsSync } from "node:fs";

const env = Object.fromEntries(
  [".env", ".env.local"]
    .filter(existsSync)
    .flatMap((f) => readFileSync(f, "utf8").split("\n"))
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "")])
);
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

// Purge stale consults now too (pg_cron also does this hourly).
const purge = await fetch(`${url}/rest/v1/rpc/purge_stale_consults`, { method: "POST", headers, body: "{}" });
if (purge.ok) console.log(`Expired consults removed: ${await purge.text()}`);

let total = 0;
for (;;) {
  const res = await fetch(`${url}/rest/v1/media_trash?select=path&limit=500`, { headers });
  if (!res.ok) {
    console.error("Could not read media_trash:", res.status, await res.text());
    process.exit(1);
  }
  const paths = (await res.json()).map((r) => r.path);
  if (!paths.length) break;
  const del = await fetch(`${url}/storage/v1/object/chat-media`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!del.ok) {
    console.error("Storage delete failed:", del.status, await del.text());
    process.exit(1);
  }
  const inList = `(${paths.map((p) => `"${p}"`).join(",")})`;
  await fetch(`${url}/rest/v1/media_trash?path=in.${encodeURIComponent(inList)}`, { method: "DELETE", headers });
  total += paths.length;
}
console.log(`Chat photos removed from storage: ${total}`);
