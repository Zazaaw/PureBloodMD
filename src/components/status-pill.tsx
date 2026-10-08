import { cn } from "@/lib/utils";

/** Kit recipe: tinted, never solid. Color always paired with a text label. */
const styles = {
  upcoming: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  progress: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  neutral: "bg-neutral-500/10 text-neutral-500 border-neutral-500/20",
} as const;

export type PillStatus = keyof typeof styles;

export function StatusPill({
  status,
  children,
  className,
}: {
  status: PillStatus;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-overline font-semibold uppercase",
        styles[status],
        className
      )}
    >
      {children}
    </span>
  );
}
