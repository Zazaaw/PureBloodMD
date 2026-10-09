import { Star } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * The people who built PureBloodMD. Set from public.founder_emails by the database,
 * never by members. "overlay" sits on photos, "pill" on cards and lists.
 */
export function FounderBadge({ variant = "pill", className }: { variant?: "pill" | "overlay"; className?: string }) {
  return (
    <span
      title="Founder of PureBloodMD"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 align-middle text-overline font-bold uppercase leading-none tracking-wider",
        variant === "overlay"
          ? "bg-linear-to-r from-amber-300 to-amber-400 text-neutral-900 shadow-sm"
          : "border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        className
      )}
    >
      <Star weight="fill" className="size-3" aria-hidden />
      Founder
    </span>
  );
}
