import { HeartStraight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * Full-screen "scrubbing in" loader: a beating heart over a sweeping ECG trace.
 * Shown while sign in / sign up / onboarding are on their way to the next page.
 */
export function HeartbeatLoader({ label = "Scrubbing in…", className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("fixed inset-0 z-50 grid place-items-center bg-background/90 backdrop-blur-sm animate-in fade-in-0", className)}
    >
      <div className="flex flex-col items-center gap-4">
        <span className="relative grid size-20 place-items-center">
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
          <HeartStraight weight="fill" className="relative size-12 animate-heartbeat text-primary" />
        </span>
        <svg viewBox="0 0 160 40" className="h-10 w-40" aria-hidden>
          <path d="M0 20h46l6-12 8 26 8-30 6 16h86" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" className="text-foreground" />
          <path
            d="M0 20h46l6-12 8 26 8-30 6 16h86"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="60 260"
            className="animate-ecg text-primary"
          />
        </svg>
        <p className="text-body-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
