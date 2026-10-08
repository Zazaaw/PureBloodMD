import { PageHeaderSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors Triage: filter column (desktop), then the deck card: photo and the action row, meta lines. */
export default function Loading() {
  return (
    <main className="pb-dock mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:pb-10" aria-busy="true" aria-label="Loading doctors">
      <PageHeaderSkeleton action="button" lines={2} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="hidden space-y-4 lg:block">
          <div className="space-y-5 rounded-xl border bg-card p-5 shadow-sm">
            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 rounded-full" /></div>
            <div className="space-y-3 border-t pt-5">
              <Skeleton className="h-4 w-16" /><Skeleton className="h-9" />
              <Skeleton className="h-4 w-28" /><Skeleton className="h-2" /><Skeleton className="h-3 w-full" />
              <Skeleton className="h-9" />
            </div>
            <div className="space-y-3 border-t pt-5">
              <Skeleton className="h-4 w-28" /><Skeleton className="h-9" />
              <Skeleton className="h-4 w-32" />
              <div className="flex flex-wrap gap-1.5">
                {["w-28", "w-32", "w-36", "w-24", "w-40"].map((w) => <Skeleton key={w} className={`h-6 rounded-full ${w}`} />)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-full" /></div>
          </div>
          <div className="space-y-2 rounded-xl border border-dashed p-5">
            <Skeleton className="h-3 w-48" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
          </div>
        </aside>
        <section className="mx-auto w-full min-w-0 max-w-[23rem]">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Skeleton className="aspect-[4/5] rounded-none" />
            <div className="flex items-center justify-center gap-3.5 py-4">
              <Skeleton className="size-11 rounded-full" />
              <Skeleton className="size-14 rounded-full" />
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="size-14 rounded-full" />
              <Skeleton className="size-11 rounded-full" />
            </div>
          </div>
          <Skeleton className="mx-auto mt-3 h-3.5 w-64 max-w-full" />
          <Skeleton className="mx-auto mt-2 h-3.5 w-56 max-w-full" />
        </section>
      </div>
    </main>
  );
}
