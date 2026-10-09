import { PageHeaderSkeleton, PostSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors a thread: header with back button, focus post + reply composer, replies card. */
export default function Loading() {
  return (
    <main className="pb-dock mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:pb-10" aria-busy="true" aria-label="Loading thread">
      <PageHeaderSkeleton action="icon" />
      <div className="rounded-xl border bg-card shadow-sm">
        <PostSkeleton />
        <div className="flex gap-3 border-t px-5 py-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <Skeleton className="mt-6 h-5 w-48" />
        </div>
      </div>
      <div className="mt-6 divide-y rounded-xl border bg-card shadow-sm">
        <PostSkeleton />
        <PostSkeleton indent />
        <PostSkeleton />
      </div>
    </main>
  );
}
