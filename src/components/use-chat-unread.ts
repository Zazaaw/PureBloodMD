"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Fired by the chat room after it marks a consult read, so the dock badge drops at once. */
export const CONSULT_READ_EVENT = "pbmd:consult-read";

/**
 * Consults that need you: chats with unread messages plus new matches you haven't opened
 * (unread_consults_count, 0025). Starts from the server count and re-counts on new
 * messages, new matches and "read" events from the chat room.
 */
export function useChatUnread(meId: string, initial: number) {
  const [count, setCount] = useState(initial);
  const [prev, setPrev] = useState(initial);
  if (initial !== prev) {
    setPrev(initial);
    setCount(initial);
  }

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const recount = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const { data, error } = await supabase.rpc("unread_consults_count");
        if (!cancelled && !error) setCount(Number(data ?? 0));
      }, 400);
    };
    (async () => {
      // Same as the EMR badge: hand Realtime the user's token so RLS lets our rows through.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`consult-unread-${meId}-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, recount)
        .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, recount)
        .subscribe();
    })();
    window.addEventListener(CONSULT_READ_EVENT, recount);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener(CONSULT_READ_EVENT, recount);
      if (channel) supabase.removeChannel(channel);
    };
  }, [meId]);

  return count;
}
