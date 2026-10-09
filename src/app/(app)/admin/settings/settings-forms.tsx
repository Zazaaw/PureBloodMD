"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRY_CODES, countryName } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function useRpc() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const call = (fn: string, args: Record<string, unknown>, done: string) =>
    start(async () => {
      const { error } = await createClient().rpc(fn, args);
      if (error) return void toast.error(error.message.includes("cannot_remove_self") ? "You can't remove yourself." : "That didn't work. Check the value and try again.");
      toast.success(done);
      router.refresh();
    });
  return { pending, call };
}

/** Launch switches (app_config): VIP program, daily swipe limit, open countries. */
export function LaunchSwitches({ vip, limit, countries }: { vip: boolean; limit: number; countries: string[] }) {
  const { pending, call } = useRpc();
  const [swipes, setSwipes] = useState(String(limit));
  const [open, setOpen] = useState<Set<string>>(new Set(countries));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">VIP program</p>
          <p className="text-body-sm text-muted-foreground">Off during launch: no plans, no paywall, unlimited chat. Turning it on restores all VIP features.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={vip}
          disabled={pending}
          onClick={() => window.confirm(vip ? "Turn VIP off? The paywall and plans disappear." : "Turn VIP on? Plans and the 10-bubble paywall come back.") && call("admin_set_config", { p_key: "vip_enabled", p_value: !vip }, vip ? "VIP switched off." : "VIP switched on.")}
          className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200", vip ? "bg-primary" : "bg-muted-foreground/30")}
        >
          <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all duration-200", vip ? "left-[1.375rem]" : "left-0.5")} />
        </button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label htmlFor="swipe-limit" className="font-medium">Daily swipe limit</label>
          <p className="text-body-sm text-muted-foreground">Swipes per rolling 24 hours for non-VIP members.</p>
        </div>
        <div className="flex gap-2">
          <Input id="swipe-limit" type="number" min={1} max={1000} value={swipes} onChange={(e) => setSwipes(e.target.value)} className="w-24 tabular-nums" />
          <Button variant="outline" disabled={pending || Number(swipes) === limit} onClick={() => call("admin_set_config", { p_key: "daily_swipe_limit", p_value: Number(swipes) }, `Limit set to ${swipes} swipes a day.`)}>Save</Button>
        </div>
      </div>

      <div>
        <p className="font-medium">Open countries</p>
        <p className="mb-2 text-body-sm text-muted-foreground">Who can sign up and which triage decks exist. Indonesia only during launch.</p>
        <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
          {COUNTRY_CODES.map((c) => {
            const on = open.has(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => setOpen((s) => { const n = new Set(s); if (on) n.delete(c); else n.add(c); return n; })}
                className={cn("rounded-full border px-2.5 py-1 text-caption transition-colors", on ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                {countryName(c)}
              </button>
            );
          })}
        </div>
        <Button
          className="mt-3"
          variant="outline"
          disabled={pending || open.size === 0 || [...open].sort().join() === [...countries].sort().join()}
          onClick={() => call("admin_set_config", { p_key: "active_countries", p_value: COUNTRY_CODES.filter((c) => open.has(c)) }, `${open.size} ${open.size === 1 ? "country" : "countries"} open.`)}
        >
          Save countries
        </Button>
      </div>
    </div>
  );
}

/** Who can open /admin. */
export function AdminsForm({ admins }: { admins: { email: string; is_me: boolean }[] }) {
  const { pending, call } = useRpc();
  const [email, setEmail] = useState("");
  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-lg border">
        {admins.map((a) => (
          <li key={a.email} className="flex items-center gap-2 px-3 py-2 text-body-sm">
            <span className="min-w-0 flex-1 break-all">{a.email}{a.is_me ? <span className="text-muted-foreground"> (you)</span> : null}</span>
            {a.is_me ? null : (
              <Button variant="ghost" size="sm" disabled={pending} aria-label={`Remove ${a.email}`} onClick={() => window.confirm(`Remove ${a.email} as admin?`) && call("admin_set_admin", { p_email: a.email, p_add: false }, "Admin removed.")}>
                <Trash />
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          call("admin_set_admin", { p_email: email, p_add: true }, `${email} is now an admin.`);
          setEmail("");
        }}
      >
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="new.admin@email.com" aria-label="New admin email" />
        <Button type="submit" disabled={pending || !email}>Add</Button>
      </form>
      <p className="text-caption text-muted-foreground">They need a PureBloodMD account with that email, then /admin opens for them.</p>
    </div>
  );
}
