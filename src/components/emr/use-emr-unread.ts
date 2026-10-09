"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Unread EMR activity (likes, replies, reposts on my posts), kept live with Realtime.
 * Starts from the server count and follows it again whenever the server value changes
 * (e.g. after the Activity page marks everything read and the layout refreshes).
 */
export function useEmrUnread(meId: string, initial: number) {
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
    (async () => {
      // The dock mounts before the session reaches Realtime; without the user's token
      // RLS hides every notification, so hand it over before subscribing.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      // Unique per instance: the dock and the header heart both listen, and two
      // channels with the same topic would collide ("after subscribe()").
      channel = supabase
        .channel(`emr-activity-${meId}-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "emr_notifications", filter: `recipient_id=eq.${meId}` },
          () => setCount((n) => n + 1)
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [meId]);

  return count;
}
