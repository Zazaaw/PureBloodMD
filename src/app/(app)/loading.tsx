import { ThreadRowSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while the Consults layout loads its inbox (Triage and Passport have
 * their own, closer loading files). Mirrors the inbox column + empty pane.
 */
export default function Loading() {
  return (
    <main className="mx-auto grid max-w-6xl lg:h-app lg:grid-cols-[22rem_1fr]" aria-busy="true" aria-label="Loading consults">
      <aside className="pb-dock flex flex-col px-4 py-6 lg:border-r lg:px-5 lg:pb-6">
        <div className="mb-6">
          <Skeleton className="mt-0 h-10 w-44" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
        <Skeleton className="mb-2 h-3 w-48" />
        <div className="mb-5 flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex w-16 flex-col items-center gap-1">
              <Skeleton className="size-[60px] rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
        <div className="-mx-2 space-y-1">
          {Array.from({ length: 6 }).map((_, i) => <ThreadRowSkeleton key={i} />)}
        </div>
      </aside>
      <section className="hidden flex-col items-center justify-center gap-3 lg:flex">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-4 w-64" />
      </section>
    </main>
  );
}
