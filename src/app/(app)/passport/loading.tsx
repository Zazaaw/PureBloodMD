import { CardSkeleton, FieldSkeleton, PageHeaderSkeleton, DoctorCardSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors Passport: overview strip with three status tiles, tab row, then the Profile tab (form + preview). */
export default function Loading() {
  return (
    <main className="pb-dock mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:pb-10" aria-busy="true" aria-label="Loading passport">
      <PageHeaderSkeleton lines={1} />
      <div className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm lg:flex-row lg:items-center">
        <div className="flex items-center gap-4 lg:w-80">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-52" /></div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:flex-1">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg sm:h-28" />)}
        </div>
      </div>
      <Skeleton className="mt-8 h-10 w-full rounded-full md:w-[30rem]" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <CardSkeleton title="w-24">
            <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />)}</div>
            <div className="grid gap-5 sm:grid-cols-[1fr_8rem]"><FieldSkeleton /><FieldSkeleton /></div>
            <div className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <FieldSkeleton key={i} />)}</div>
          </CardSkeleton>
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <aside className="hidden space-y-3 lg:block">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
          <DoctorCardSkeleton />
        </aside>
      </div>
    </main>
  );
}
