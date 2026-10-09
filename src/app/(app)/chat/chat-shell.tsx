"use client";

import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SealCheck } from "@phosphor-icons/react";
import BlurFade from "@/components/effects/blur-fade";
import { DoctorPhoto } from "@/components/doctor-photo";
import { OnlineDot } from "@/components/presence";
import PageHeader from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/client";
import { previewText } from "@/lib/stickers";
import type { InboxRow } from "@/lib/types";
import { cn } from "@/lib/utils";

function timeLabel(iso: string | null) {
  if (!iso) return "Now";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Inbox column + active room. On phones only one of the two is visible. */
type Me = { id: string; gender: "female" | "male"; intent: "romance" | "connect" };

/** Who opens a match: in romance female x male, she does (Bumble); otherwise anyone. */
function opener(me: Me, r: InboxRow) {
  if (me.intent !== "romance" || me.gender === r.other_gender) return "Anyone's move";
  return me.gender === "female" ? "Your move" : "Her move";
}

export function ChatShell({ me, inbox, children }: { me: Me; inbox: InboxRow[]; children: React.ReactNode }) {
  const meId = me.id;
  const activeId = useSelectedLayoutSegment();
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Clock for the "flatlines in" labels, ticking once a minute.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Any new message in any of my matches (RLS filters the stream) refreshes the inbox.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => router.refresh(), 600);
      })
      // New matches (someone liked me back) and ended ones (unmatch, asystole) too.
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => router.refresh(), 600);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Bumble layout: matches nobody has written to yet sit in the circles row;
  // a conversation only joins the list below once the first message is sent.
  const fresh = inbox.filter((r) => r.bubble_count === 0);
  const chats = inbox.filter((r) => r.bubble_count > 0);

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 lg:h-app lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className={cn("pb-dock flex min-h-0 min-w-0 flex-col px-4 py-6 lg:border-r lg:px-5 lg:pb-6", activeId && "hidden lg:flex")}>
        <BlurFade>
          <PageHeader
            title="Consults"
            subtitle={
              inbox.length
                ? `${chats.length} ${chats.length === 1 ? "consult" : "consults"} · ${fresh.length} new ${fresh.length === 1 ? "match" : "matches"}`
                : "Matches show up here as circles. Write within 24 hours or they flatline."
            }
            className="[&_h3]:mt-0"
          />
        </BlurFade>

        {fresh.length ? (
          <section aria-label="New matches" className="mb-5">
            <p className="mb-2 text-overline font-semibold uppercase text-muted-foreground">New matches · write within 24h</p>
            <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {fresh.map((r) => {
                const hours = Math.max(0, Math.ceil((new Date(r.expires_at).getTime() - now) / 3_600_000));
                const move = opener(me, r);
                const mine = move !== "Her move";
                return (
                  <li key={r.match_id} className="shrink-0">
                    <Link
                      href={`/chat/${r.match_id}`}
                      aria-current={activeId === r.match_id ? "page" : undefined}
                      aria-label={`${r.other_name}. ${move}. Flatlines in ${hours} hours.`}
                      className="flex w-[4.5rem] flex-col items-center gap-1 text-center"
                    >
                      <span className={cn("relative rounded-full p-0.5", mine ? "bg-linear-to-tr from-primary to-amber-400" : "bg-border")}>
                        <DoctorPhoto src={r.other_photo} fallback={r.other_photo_fallback} alt="" size={60} className="ring-2 ring-background" />
                        <OnlineDot id={r.other_id} isBot={r.other_is_bot} className="bottom-0.5 right-0.5 size-3.5" />
                        <span
                          className={cn(
                            "absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border-2 border-background px-1.5 font-mono text-overline font-bold leading-4 tabular-nums",
                            hours <= 6 ? "bg-red-500 text-white" : "bg-foreground text-background"
                          )}
                          suppressHydrationWarning
                        >
                          {hours}h
                        </span>
                      </span>
                      <span className="mt-1 text-caption font-medium leading-tight">{r.other_name.replace(/^dr\.?\s*/i, "").split(/[ ,]/)[0]}</span>
                      <span className={cn("text-caption leading-tight", mine ? "text-primary" : "text-muted-foreground")}>{move}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <ul className="-mx-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {chats.map((r, i) => (
            <li key={r.match_id}>
              <BlurFade inView delay={Math.min(i, 8) * 0.04}>
                <Link
                  href={`/chat/${r.match_id}`}
                  aria-current={activeId === r.match_id ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-accent",
                    activeId === r.match_id && "bg-secondary"
                  )}
                >
                  <span className="relative shrink-0">
                    <DoctorPhoto src={r.other_photo} fallback={r.other_photo_fallback} alt="" size={44} />
                    <OnlineDot id={r.other_id} isBot={r.other_is_bot} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1">
                        <span className="font-semibold leading-snug">{r.other_name}</span>
                        {r.other_verified ? <SealCheck weight="fill" className="size-3.5 shrink-0 text-sky-500" aria-label="Verified" /> : null}
                      </span>
                      <span className="shrink-0 text-caption text-muted-foreground tabular-nums" suppressHydrationWarning>{timeLabel(r.last_at ?? r.matched_at)}</span>
                    </span>
                    {(() => {
                      const left = new Date(r.expires_at).getTime() - now;
                      const days = Math.max(0, Math.ceil(left / 86_400_000));
                      return days <= 3 ? (
                        <span className="block text-caption text-amber-600 dark:text-amber-400" suppressHydrationWarning>
                          Quiet for a while. Auto-deletes in {days} {days === 1 ? "day" : "days"} unless someone texts
                        </span>
                      ) : null;
                    })()}
                    <span className="block truncate text-body-sm text-muted-foreground">
                      {r.last_at
                        ? `${r.last_sender === meId ? "You: " : ""}${r.last_is_image ? `Photo${r.last_body ? `: ${r.last_body}` : ""}` : previewText(r.last_body)}`
                        : r.bubble_count > 0
                          ? "Chat deleted"
                          : "New resuscitation match!"}
                    </span>
                  </span>
                </Link>
              </BlurFade>
            </li>
          ))}
        </ul>
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-semibold">{fresh.length ? "No conversations yet" : "No consults yet"}</p>
            <p className="mt-1 max-w-[30ch] text-body-sm text-muted-foreground">
              {fresh.length
                ? "Tap a circle above to make the first incision. The chat moves down here once it starts."
                : "Match with someone in triage. They show up here as a circle first."}
            </p>
            {fresh.length ? null : (
              <Link href="/discover" className="mt-4 text-body-sm font-medium underline underline-offset-4">Go to triage</Link>
            )}
          </div>
        ) : null}
      </aside>

      <section className={cn("min-h-0 min-w-0", !activeId && "hidden lg:block")}>{children}</section>
    </main>
  );
}
