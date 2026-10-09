import { PageHeaderSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors Activity: header with a back button, then rows of avatar + two lines. */
export default function Loading() {
  return (
    <main className="pb-dock mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:pb-10" aria-busy="true" aria-label="Loading activity">
      <PageHeaderSkeleton action="button" />
      <div className="divide-y rounded-xl border bg-card shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 px-5 py-4">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
