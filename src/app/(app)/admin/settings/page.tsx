import type { Metadata } from "next";
import { GearSix } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { SectionHero } from "../hero";
import { AdminsForm, LaunchSwitches } from "./settings-forms";

export const metadata: Metadata = { title: "Admin settings" };

type Log = { id: number; admin_email: string; action: string; target_id: string | null; target_name: string | null; details: Record<string, unknown>; created_at: string };

/** Launch switches, who is an admin, and the audit log of every moderation action. */
export default async function AdminSettingsPage() {
  const { supabase } = await requireProfile();
  const [{ data: config }, { data: admins }, { data: log }] = await Promise.all([
    supabase.rpc("admin_get_config"),
    supabase.rpc("admin_list_admins"),
    supabase.rpc("admin_audit_log", { p_limit: 100 }),
  ]);
  const c = (config ?? {}) as { vip_enabled?: boolean; daily_swipe_limit?: number; active_countries?: string[] };

  return (
    <BlurFade>
      <SectionHero
        icon={<GearSix weight="fill" />}
        eyebrow="Control room"
        title="Settings"
        subtitle="Switches take effect immediately, no redeploy. Every change is logged below."
        chips={[
          { label: "VIP", value: c.vip_enabled ? "On" : "Off", tone: c.vip_enabled ? "ok" : "muted" },
          { label: "swipes a day", value: c.daily_swipe_limit ?? 20, tone: "muted" },
          { label: (c.active_countries ?? ["ID"]).length === 1 ? "country open" : "countries open", value: (c.active_countries ?? ["ID"]).length, tone: "muted" },
          { label: "admins", value: (admins ?? []).length, tone: "muted" },
        ]}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader><CardTitle>Launch switches</CardTitle><CardDescription>Stored in app_config, read by the app and enforced by the database.</CardDescription></CardHeader>
          <CardContent>
            <LaunchSwitches vip={Boolean(c.vip_enabled)} limit={Number(c.daily_swipe_limit ?? 20)} countries={c.active_countries ?? ["ID"]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Admins</CardTitle><CardDescription>Emails allowed into this dashboard.</CardDescription></CardHeader>
          <CardContent><AdminsForm admins={(admins ?? []) as { email: string; is_me: boolean }[]} /></CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader><CardTitle>Audit log</CardTitle><CardDescription>Bans, badges, report decisions, removed posts and setting changes.</CardDescription></CardHeader>
        <CardContent>
          {(log ?? []).length === 0 ? <p className="text-body-sm text-muted-foreground">Nothing logged yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm">
                <thead className="text-caption uppercase text-muted-foreground">
                  <tr><th className="py-2 pr-4 font-semibold">When</th><th className="py-2 pr-4 font-semibold">Admin</th><th className="py-2 pr-4 font-semibold">Action</th><th className="py-2 font-semibold">Target</th></tr>
                </thead>
                <tbody className="divide-y">
                  {(log as Log[]).map((l) => (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-muted-foreground">{new Date(l.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-2 pr-4 break-all">{l.admin_email}</td>
                      <td className="py-2 pr-4">{l.action.replaceAll("_", " ")}{l.details?.key ? `: ${String(l.details.key)}` : ""}</td>
                      <td className="py-2">{l.target_id ? <a href={`/admin/users/${l.target_id}`} className="underline-offset-4 hover:underline">{l.target_name ?? "member"}</a> : String(l.details?.email ?? "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </BlurFade>
  );
}
