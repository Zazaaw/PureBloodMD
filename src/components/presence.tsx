"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PresenceCtx = { online: Set<string>; tick: number };
const Ctx = createContext<PresenceCtx>({ online: new Set(), tick: 0 });

/**
 * Real doctors: Supabase Realtime Presence (online while a tab is open).
 * Bot doctors have no tab, so they keep a simulated shift: each bot is
 * on or off duty per 30-minute window (~40% online), stable for everyone.
 */
export function PresenceProvider({ meId, children }: { meId: string; children: React.ReactNode }) {
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(() => Math.floor(Date.now() / 1_800_000));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("online-doctors", { config: { presence: { key: meId } } });
    channel
      .on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(channel.presenceState()))))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ at: Date.now() });
      });
    const t = setInterval(() => setTick(Math.floor(Date.now() / 1_800_000)), 60_000);
    return () => {
      clearInterval(t);
      supabase.removeChannel(channel);
    };
  }, [meId]);

  const value = useMemo(() => ({ online, tick }), [online, tick]);
  return <Ctx value={value}>{children}</Ctx>;
}

function botOnDuty(id: string, window: number) {
  let h = window;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h ^ id.charCodeAt(i), 2654435761) >>> 0);
  return h % 10 < 4;
}

export function useIsOnline(id: string, isBot: boolean) {
  const { online, tick } = useContext(Ctx);
  return isBot ? botOnDuty(id, tick) : online.has(id);
}

/** Small green bubble pinned to an avatar's bottom-right. Parent must be `relative`. */
export function OnlineDot({ id, isBot, className }: { id: string; isBot: boolean; className?: string }) {
  const on = useIsOnline(id, isBot);
  if (!on) return null;
  return (
    <span
      role="img"
      aria-label="Online"
      title="Online"
      className={cn("absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-background", className)}
    />
  );
}
