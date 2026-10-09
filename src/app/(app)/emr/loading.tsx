import { ComposerSkeleton, PageHeaderSkeleton, PostSkeleton } from "@/components/skeletons";

/** Mirrors EMR: header, composer card, feed card. */
export default function Loading() {
  return (
    <main className="pb-dock mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:pb-10" aria-busy="true" aria-label="Loading EMR">
      <PageHeaderSkeleton />
      <ComposerSkeleton />
      <div className="mt-6 divide-y rounded-xl border bg-card shadow-sm">
        {[0, 1, 2, 3].map((i) => <PostSkeleton key={i} />)}
      </div>
    </main>
  );
}
