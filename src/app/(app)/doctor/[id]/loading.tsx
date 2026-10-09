import { PageHeaderSkeleton, PostSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors a doctor profile: header card (name, meta, photo, bio, buttons), tabs, posts. */
export default function Loading() {
  return (
    <main className="pb-dock mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:pb-10" aria-busy="true" aria-label="Loading profile">
      <PageHeaderSkeleton />
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-4 w-56" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="size-20 shrink-0 rounded-full sm:size-22" />
        </div>
        <Skeleton className="mt-5 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <Skeleton className="mt-5 h-4 w-36" />
        <Skeleton className="mt-5 h-9 w-full" />
      </div>
      <Skeleton className="mt-6 h-11 w-full rounded-full md:w-72" />
      <div className="mt-4 divide-y rounded-xl border bg-card shadow-sm">
        {[0, 1, 2].map((i) => <PostSkeleton key={i} />)}
      </div>
    </main>
  );
}
