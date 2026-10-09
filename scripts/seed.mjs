// Adds the bot doctors from supabase/seed-doctors.json that are not in the DB yet.
// Never deletes anything, so existing matches and chats stay intact.
// Runs on YOUR machine only (service_role key). Usage: npm run db:seed
// Needs the schema first (supabase/migrations/*.sql in the SQL Editor, in order).
import { readFileSync, existsSync } from "node:fs";

function loadEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
      })
  );
}

const env = { ...loadEnv(".env"), ...loadEnv(".env.local"), ...process.env };
const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const rows = JSON.parse(readFileSync(new URL("../supabase/seed-doctors.json", import.meta.url), "utf8"));

const res = await fetch(`${url}/rest/v1/profiles?is_bot=eq.true&select=display_name`, { headers });
if (!res.ok) {
  console.error("Could not read profiles:", res.status, await res.text());
  console.error("Did you run the SQL migrations first?");
  process.exit(1);
}
const existing = new Set((await res.json()).map((r) => r.display_name));
const missing = rows.filter((r) => !existing.has(r.display_name));
console.log(`${existing.size} bot doctors already on call, adding ${missing.length}.`);

for (let i = 0; i < missing.length; i += 100) {
  const batch = missing.slice(i, i + 100);
  const r = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(batch),
  });
  if (!r.ok) {
    console.error(`Batch ${i / 100 + 1} failed:`, r.status, await r.text());
    process.exit(1);
  }
  console.log(`Added ${Math.min(i + 100, missing.length)} / ${missing.length}`);
}
// International doctors (one per gender per specialty per country), placed on the radar map.
const worldFile = new URL("../supabase/seed-doctors-world.json", import.meta.url);
let worldAdded = 0;
if (existsSync(worldFile)) {
  const world = JSON.parse(readFileSync(worldFile, "utf8")).filter((r) => !existing.has(r.display_name));
  for (let i = 0; i < world.length; i += 100) {
    const batch = world.slice(i, i + 100);
    const r = await fetch(`${url}/rest/v1/profiles?select=id,display_name`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(batch.map((b) => Object.fromEntries(Object.entries(b).filter(([k]) => k !== "lat" && k !== "lng")))),
    });
    if (!r.ok) {
      console.error(`World batch ${i / 100 + 1} failed:`, r.status, await r.text());
      process.exit(1);
    }
    const ids = new Map((await r.json()).map((x) => [x.display_name, x.id]));
    const locs = batch.map((b) => ({ profile_id: ids.get(b.display_name), lat: b.lat, lng: b.lng }));
    const l = await fetch(`${url}/rest/v1/locations`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify(locs),
    });
    if (!l.ok) {
      console.error("Locations failed:", l.status, await l.text());
      process.exit(1);
    }
    worldAdded += batch.length;
    console.log(`International doctors added: ${worldAdded} / ${world.length}`);
  }
}
// Demo EMR threads (no-op once the feed has posts; needs migration 0011).
const emr = await fetch(`${url}/rest/v1/rpc/seed_emr_bot_posts`, { method: "POST", headers, body: "{}" });
if (emr.ok) console.log(`EMR demo threads added: ${await emr.text()}`);

console.log(`Done. ${existing.size + missing.length + worldAdded} doctors are on call.`);
