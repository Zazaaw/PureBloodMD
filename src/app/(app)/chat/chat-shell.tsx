"use client";

import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { useEffect, useRef } from "react";
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
export function ChatShell({ meId, inbox, children }: { meId: string; inbox: InboxRow[]; children: React.ReactNode }) {
  const activeId = useSelectedLayoutSegment();
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Any new message in any of my matches (RLS filters the stream) refreshes the inbox.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => router.refresh(), 600);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const fresh = inbox.filter((r) => r.bubble_count === 0);

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 lg:h-app lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className={cn("pb-dock flex min-h-0 min-w-0 flex-col px-4 py-6 lg:border-r lg:px-5 lg:pb-6", activeId && "hidden lg:flex")}>
        <BlurFade>
          <PageHeader
            title="Consults"
            subtitle={`${inbox.length} active resuscitations`}
            className="[&_h3]:mt-0"
          />
        </BlurFade>

        {fresh.length ? (
          <section aria-label="New matches" className="mb-5">
            <p className="mb-2 text-overline font-semibold uppercase text-muted-foreground">New resuscitation matches</p>
            <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
              {fresh.map((r) => (
                <li key={r.match_id}>
                  <Link href={`/chat/${r.match_id}`} className="flex w-16 flex-col items-center gap-1">
                    <span className="relative rounded-full bg-linear-to-tr from-primary to-amber-400 p-0.5">
                      <DoctorPhoto src={r.other_photo} fallback={r.other_photo_fallback} alt={r.other_name} size={56} className="ring-2 ring-background" />
                      <OnlineDot id={r.other_id} isBot={r.other_is_bot} className="bottom-0.5 right-0.5 size-3.5" />
                    </span>
                    <span className="w-full truncate text-center text-caption">{r.other_name.split(" ")[1]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <ul className="-mx-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {inbox.map((r, i) => (
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
                      const days = Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / 86_400_000);
                      return days <= 7 ? (
                        <span className="block text-caption text-amber-600 dark:text-amber-400" suppressHydrationWarning>
                          Auto-deletes in {Math.max(days, 0)} {days === 1 ? "day" : "days"} unless someone texts
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
        {inbox.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-body-sm text-muted-foreground">No consults yet. Defibrillate someone in triage first.</p>
            <Link href="/discover" className="mt-4 text-body-sm font-medium underline underline-offset-4">Go to triage</Link>
          </div>
        ) : null}
      </aside>

      <section className={cn("min-h-0 min-w-0", !activeId && "hidden lg:block")}>{children}</section>
    </main>
  );
}
