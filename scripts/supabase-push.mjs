// One command to configure the Supabase project from this repo, via the
// Supabase Management API. Needs a Personal Access Token:
//   supabase.com/dashboard/account/tokens  ->  SUPABASE_ACCESS_TOKEN in .env.local
//
// Usage:
//   npm run supabase:push -- sql 0005          run supabase/migrations/0005_*.sql
//   npm run supabase:push -- email             confirm-signup template + subject + Site URL + redirects
//   npm run supabase:push -- all 0005          both
import { readFileSync, readdirSync, existsSync } from "node:fs";

const env = Object.fromEntries(
  [".env", ".env.local"]
    .filter(existsSync)
    .flatMap((f) => readFileSync(f, "utf8").split("\n"))
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "")])
);
const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
const ref = url.replace(/^https:\/\//, "").split(".")[0];
// Site URL = production (fallback for links); every listed origin may receive confirmation links.
const local = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3333";
const site = (env.SITE_URL_PRODUCTION || local).replace(/\/$/, "");
const extra = (env.SITE_URL_EXTRA || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
const origins = [...new Set([site, ...extra, local.replace(/\/$/, "")])];
if (!token || !ref) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (supabase.com/dashboard/account/tokens) or NEXT_PUBLIC_SUPABASE_URL in .env.local");
  process.exit(1);
}
const api = (path, init = {}) =>
  fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

async function runSql(prefix) {
  const file = readdirSync("supabase/migrations").find((f) => f.startsWith(prefix));
  if (!file) throw new Error(`No migration starting with ${prefix}`);
  const query = readFileSync(`supabase/migrations/${file}`, "utf8");
  const res = await api("/database/query", { method: "POST", body: JSON.stringify({ query }) });
  if (!res.ok) throw new Error(`${file}: ${res.status} ${await res.text()}`);
  console.log(`Applied ${file}`);
}

async function patchAuth(body, what) {
  const res = await api("/config/auth", { method: "PATCH", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${what}: ${res.status} ${await res.text()}`);
  console.log(`Updated: ${what}`);
}

async function pushEmail() {
  // 1. URLs are allowed on every plan.
  await patchAuth(
    { site_url: site, uri_allow_list: origins.flatMap((o) => [`${o}/auth/callback`, `${o}/auth/confirm`, `${o}/**`]).join(",") },
    `Site URL (${site}) and redirect URLs for ${origins.join(", ")}`
  );

  // 2. Custom templates need a custom SMTP sender on the free plan.
  const smtp = {
    host: env.SMTP_HOST, port: env.SMTP_PORT || "587", user: env.SMTP_USER, pass: env.SMTP_PASS,
    from: env.SMTP_FROM || env.SMTP_USER, name: env.SMTP_SENDER_NAME || "PureBloodMD",
  };
  const haveSmtp = smtp.host && smtp.user && smtp.pass;
  if (haveSmtp && !env.SMTP_FROM) {
    console.error("SMTP_FROM is empty. Use an address on a domain you verified with your SMTP provider (Resend: Domains).");
    process.exit(2);
  }
  if (haveSmtp && /@resend\.dev$/i.test(smtp.from)) {
    console.warn("Note: onboarding@resend.dev only delivers to your own Resend account email. Verify a domain for real users.");
  }
  if (haveSmtp) {
    await patchAuth(
      {
        smtp_host: smtp.host, smtp_port: String(smtp.port), smtp_user: smtp.user, smtp_pass: smtp.pass,
        smtp_admin_email: smtp.from, smtp_sender_name: smtp.name, rate_limit_email_sent: 30,
      },
      `custom SMTP (${smtp.host} as ${smtp.from})`
    );
  }

  const template = (f) => readFileSync(`supabase/templates/${f}`, "utf8").replace(/^<!--[\s\S]*?-->\s*/, "");
  try {
    await patchAuth(
      {
        mailer_subjects_confirmation: "Confirm your email to scrub in",
        mailer_templates_confirmation_content: template("confirm-signup.html"),
        mailer_subjects_recovery: "Reset your PureBloodMD password",
        mailer_templates_recovery_content: template("reset-password.html"),
      },
      "confirm-signup + reset-password email templates and subjects"
    );
  } catch (e) {
    if (!haveSmtp && /custom SMTP|free tier/i.test(e.message)) {
      console.error("Template NOT applied: Supabase free tier only allows custom templates with your own SMTP sender.");
      console.error("Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM to .env.local and run this again.");
      process.exit(2);
    }
    throw e;
  }
}

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === "sql" || cmd === "all") await runSql(arg);
  if (cmd === "email" || cmd === "all") await pushEmail();
  if (!["sql", "email", "all"].includes(cmd)) console.log("Usage: npm run supabase:push -- sql 0005 | email | all 0005");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
