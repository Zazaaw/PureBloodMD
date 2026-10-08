import { CardSkeleton, FieldSkeleton, PageHeaderSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors onboarding: header, three form cards, submit button. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6" aria-busy="true" aria-label="Loading passport form">
      <PageHeaderSkeleton lines={2} />
      <div className="space-y-6">
        <CardSkeleton title="w-28">
          <div className="flex items-center gap-4"><Skeleton className="size-24 rounded-xl" /><Skeleton className="h-8 w-32" /></div>
          <div className="grid gap-5 sm:grid-cols-[1fr_8rem]"><FieldSkeleton /><FieldSkeleton /></div>
          <Skeleton className="h-10 w-64 rounded-full" />
          <Skeleton className="h-10 w-72 max-w-full rounded-full" />
        </CardSkeleton>
        <CardSkeleton title="w-44">
          <div className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 7 }).map((_, i) => <FieldSkeleton key={i} />)}</div>
        </CardSkeleton>
        <CardSkeleton title="w-40">
          <div className="grid gap-5 sm:grid-cols-3"><FieldSkeleton /><FieldSkeleton /><FieldSkeleton /></div>
          <Skeleton className="h-24 w-full" />
        </CardSkeleton>
        <Skeleton className="h-10 w-44" />
      </div>
    </main>
  );
}
