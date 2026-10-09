import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the admin pages: section pills, a title, then stat tiles and cards. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading admin">
      <div className="mb-8 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />)}
      </div>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}
