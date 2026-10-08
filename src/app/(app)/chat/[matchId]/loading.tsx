import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the chat room: header, telemetry ribbon, bubbles, flirt chips, composer. */
export default function Loading() {
  const bubbles = [
    { side: "start", w: "w-56" },
    { side: "end", w: "w-44" },
    { side: "start", w: "w-64" },
    { side: "end", w: "w-32" },
    { side: "start", w: "w-48" },
  ] as const;
  return (
    <div className="h-app pb-safe flex flex-col" aria-busy="true" aria-label="Loading consult">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Skeleton className="size-9 lg:hidden" />
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="size-9 shrink-0" />
      </header>
      <div className="flex justify-between gap-2 border-b px-4 py-2.5">
        <Skeleton className="h-4 w-72 max-w-[60%]" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden px-4 py-5">
        {bubbles.map((b, i) => (
          <div key={i} className={b.side === "end" ? "flex flex-col items-end gap-1" : "flex flex-col items-start gap-1"}>
            <Skeleton className={`h-10 max-w-[80%] rounded-2xl ${b.w}`} />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
      <div className="flex gap-2 overflow-hidden px-4 pb-2">
        {[32, 36, 40, 32, 36].map((w, i) => <Skeleton key={i} className="h-7 shrink-0 rounded-full" style={{ width: `${w * 0.25}rem` }} />)}
      </div>
      <div className="flex gap-2 border-t px-4 py-3">
        <Skeleton className="size-9 shrink-0" />
        <Skeleton className="size-9 shrink-0" />
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-12 shrink-0 sm:w-20" />
      </div>
    </div>
  );
}
