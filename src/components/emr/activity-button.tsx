"use client";

import Link from "next/link";
import { HeartStraight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useEmrUnread } from "./use-emr-unread";

/** The heart in the EMR header: who liked, replied to or reposted your posts. */
export function ActivityButton({ meId, unread }: { meId: string; unread: number }) {
  const count = useEmrUnread(meId, unread);
  return (
    <Link
      href="/emr/activity"
      aria-label={count ? `Activity, ${count} new` : "Activity"}
      className="relative grid size-10 place-items-center rounded-full border bg-card shadow-sm transition-colors duration-200 hover:bg-accent"
    >
      <HeartStraight weight={count ? "fill" : "regular"} className={cn("size-5", count ? "animate-heartbeat text-primary" : "text-foreground")} />
      {count ? (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full border-2 border-background bg-primary px-1 text-center text-caption font-semibold leading-4 text-primary-foreground tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
