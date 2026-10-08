import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeleton building blocks that mirror the real components 1:1 (same paddings,
 * radii and proportions), so content resolves in place instead of jumping.
 */

/** PageHeader: H3 (mt-8, text-3xl) + one or two muted subtitle lines, mb-6. */
export function PageHeaderSkeleton({
  action,
  lines = 1,
}: {
  /** "icon": a size-9 icon button; "button": a text button shown on phones only (Filters). */
  action?: "icon" | "button";
  lines?: 1 | 2;
}) {
  return (
    <div className="mb-6 pt-2">
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-10 w-44" />
        {action === "icon" ? <Skeleton className="size-9 shrink-0" /> : null}
        {action === "button" ? <Skeleton className="h-9 w-24 shrink-0 lg:hidden" /> : null}
      </div>
      <div className="mt-2 max-w-2xl space-y-2">
        <Skeleton className="h-4 w-full max-w-xl" />
        {lines === 2 ? <Skeleton className="h-4 w-2/3" /> : null}
      </div>
    </div>
  );
}

/** DoctorCard: 4:5 photo with overlay lines, then auscultate bar, 3 vitals, Rx block, tags. */
export function DoctorCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)} aria-hidden>
      <div className="relative aspect-[4/5]">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute inset-x-0 top-0 flex justify-between p-4">
          <Skeleton className="h-6 w-36 rounded-full bg-foreground/15" />
          <Skeleton className="h-6 w-20 rounded-full bg-foreground/15" />
        </div>
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-5">
          <Skeleton className="h-7 w-3/4 bg-foreground/15" />
          <Skeleton className="h-4 w-1/2 bg-foreground/15" />
          <Skeleton className="h-4 w-2/3 bg-foreground/15" />
        </div>
      </div>
      <div className="space-y-4 p-5">
        <Skeleton className="h-12 rounded-lg" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
        <Skeleton className="h-20 rounded-lg" />
        <div className="flex gap-2">
          {[20, 24, 16, 20].map((w, i) => <Skeleton key={i} className="h-5 rounded-md" style={{ width: `${w * 0.25}rem` }} />)}
        </div>
      </div>
    </div>
  );
}

/** Card (kit): rounded-xl border, header p-6 with title, then content rows. */
export function CardSkeleton({ title = "w-32", children, className }: { title?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card shadow-sm", className)} aria-hidden>
      <div className="p-6"><Skeleton className={cn("h-5", title)} /></div>
      <div className="space-y-4 p-6 pt-0">{children}</div>
    </div>
  );
}

/** Field: label line + h-9 control. */
export function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

/** Inbox row: 44px avatar, name + time, one snippet line. */
export function ThreadRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-2.5">
      <Skeleton className="size-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex justify-between gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-3.5 w-52 max-w-full" />
      </div>
    </div>
  );
}
