"use client";

import { useState } from "react";
import { HandsClapping, HeartStraight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type Intent = "romance" | "connect";

const OPTIONS = [
  { value: "romance", icon: HeartStraight, title: "Romance", body: "Find your MD x MD match. Flirting encouraged, she writes first." },
  { value: "connect", icon: HandsClapping, title: "Connect", body: "Meet colleagues and future referral buddies. Strictly professional." },
] as const;

/** "What are you here for?": a two-card radio that posts as `intent`. */
export function IntentPicker({ defaultValue = "romance", compact = false }: { defaultValue?: Intent; compact?: boolean }) {
  const [value, setValue] = useState<Intent>(defaultValue);
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-body-sm font-medium">What are you here for?</legend>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map(({ value: v, icon: Icon, title, body }) => {
          const on = value === v;
          return (
            <label
              key={v}
              className={cn(
                "flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 transition-colors duration-200 hover:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                on && "border-primary/50 bg-primary/5"
              )}
            >
              <input type="radio" name="intent" value={v} checked={on} onChange={() => setValue(v)} className="sr-only" />
              <span className="flex items-center gap-2 font-semibold">
                <Icon weight={on ? "fill" : "regular"} className={cn("size-5 shrink-0", on ? "text-primary" : "text-muted-foreground")} />
                {title}
              </span>
              {compact ? null : <span className="text-caption text-muted-foreground">{body}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
