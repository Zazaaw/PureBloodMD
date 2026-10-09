import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ClipboardText } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { ActivityButton } from "@/components/emr/activity-button";
import { Composer } from "@/components/emr/composer";
import { PostCard } from "@/components/emr/post-card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth";
import { EMR_PAGE, EMR_SELECT, hydratePosts } from "@/lib/emr";

export const metadata: Metadata = { title: "EMR" };

export default async function EmrPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { before } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const { data: unread } = await supabase.rpc("emr_unread_count");
  const me = { id: profile.id, name: profile.display_name, photo: profile.photo_url };

  let query = supabase
    .from("emr_posts")
    .select(EMR_SELECT)
    .is("parent_id", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(EMR_PAGE);
  if (before && !Number.isNaN(Date.parse(before))) query = query.lt("created_at", before);
  const { data } = await query;
  const posts = await hydratePosts(supabase, profile.id, data);
  const older = posts.length === EMR_PAGE ? posts[posts.length - 1].created_at : null;

  return (
    <main className="pb-dock mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:pb-10">
      <BlurFade>
        <PageHeader
          title="EMR"
          subtitle="Electronic Medical Record, for doctors. Chart a case, a post-call thought or a cafeteria review. No patient data, ever."
          action={<ActivityButton meId={profile.id} unread={Number(unread ?? 0)} />}
        />

        {before ? null : (
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <Composer me={me} />
          </div>
        )}

        {posts.length ? (
          <div className="mt-6 divide-y rounded-xl border bg-card shadow-sm">
            {posts.map((post, i) => (
              <BlurFade key={post.id} inView delay={Math.min(i, 6) * 0.05}>
                <PostCard post={post} me={me} />
              </BlurFade>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
            <ClipboardText className="size-8 text-muted-foreground" />
            <p className="mt-4 text-body font-semibold">No entries on the chart yet.</p>
            <p className="mt-1 max-w-[36ch] text-body-sm text-muted-foreground">
              The record is blank. Be the first to write an entry today.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-3">
          {before ? (
            <Button variant="outline" asChild>
              <Link href="/emr">Back to latest</Link>
            </Button>
          ) : null}
          {older ? (
            <Button variant="outline" asChild>
              <Link href={`/emr?before=${encodeURIComponent(older)}`}>
                Older posts <ArrowDown />
              </Link>
            </Button>
          ) : null}
        </div>
      </BlurFade>
    </main>
  );
}
