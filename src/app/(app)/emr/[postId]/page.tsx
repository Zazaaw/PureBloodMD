import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { Composer } from "@/components/emr/composer";
import { PostCard } from "@/components/emr/post-card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth";
import { EMR_SELECT, UUID_RE, hydratePosts } from "@/lib/emr";

export const metadata: Metadata = { title: "EMR thread" };

/**
 * One post with its conversation: the post it answers (if any), the post
 * itself, its direct replies, and one level of replies under each of those.
 * Deeper replies open on their own page, like Threads.
 */
export default async function ThreadPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!UUID_RE.test(postId)) notFound();
  const { supabase, profile } = await requireProfile();
  const me = { id: profile.id, name: profile.display_name, photo: profile.photo_url };

  // EMR_SELECT is built from parts, so the client cannot infer row types; these two fields are all we read here.
  type Row = { id: string; parent_id: string | null };
  const { data: row } = await supabase.from("emr_posts").select(EMR_SELECT).eq("id", postId).maybeSingle<Row>();
  if (!row) notFound();

  const [{ data: parentRow }, { data: childRows }] = await Promise.all([
    row.parent_id
      ? supabase.from("emr_posts").select(EMR_SELECT).eq("id", row.parent_id).maybeSingle<Row>()
      : Promise.resolve({ data: null }),
    supabase.from("emr_posts").select(EMR_SELECT).eq("parent_id", postId).order("created_at").limit(100).returns<Row[]>(),
  ]);
  const childIds = (childRows ?? []).map((c) => c.id);
  const { data: grandRows } = childIds.length
    ? await supabase.from("emr_posts").select(EMR_SELECT).in("parent_id", childIds).order("created_at").limit(300)
    : { data: [] };

  const all = await hydratePosts(supabase, profile.id, [row, ...(parentRow ? [parentRow] : []), ...(childRows ?? []), ...(grandRows ?? [])]);
  const byId = new Map(all.map((p) => [p.id, p]));
  const post = byId.get(postId)!;
  const parent = post.parent_id ? byId.get(post.parent_id) ?? null : null;
  const children = all.filter((p) => p.parent_id === post.id);
  const repliesOf = (id: string) => all.filter((p) => p.parent_id === id);

  return (
    <main className="pb-dock mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:pb-10">
      <BlurFade>
        <PageHeader
          title="Thread"
          subtitle={`${post.author.display_name} on EMR`}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href={parent ? `/emr/${parent.id}` : "/emr"}>
                <ArrowLeft /> {parent ? "Previous post" : "EMR"}
              </Link>
            </Button>
          }
        />

        <div className="rounded-xl border bg-card shadow-sm">
          {parent ? <PostCard post={parent} me={me} threadLine className="pb-2" /> : null}
          <PostCard post={post} me={me} variant="focus" replyingTo={parent ? { id: parent.author.id, name: parent.author.display_name } : null} />
          {post.deleted_at ? null : (
            <div className="border-t px-5 py-4">
              <Composer me={me} parentId={post.id} placeholder={`Reply to ${post.author.display_name}...`} />
            </div>
          )}
        </div>

        {children.length ? (
          <section aria-label="Replies" className="mt-6 divide-y rounded-xl border bg-card shadow-sm">
            {children.map((child, i) => {
              const replies = repliesOf(child.id);
              return (
                <BlurFade key={child.id} inView delay={Math.min(i, 6) * 0.05}>
                  <PostCard post={child} me={me} inlineReply threadLine={replies.length > 0} />
                  {replies.map((reply) => (
                    <div key={reply.id}>
                      <PostCard post={reply} me={me} inlineReply className="pl-[4.25rem]" />
                      {reply.reply_count > 0 ? (
                        <Link
                          href={`/emr/${reply.id}`}
                          className="-mt-2 flex items-center gap-1 pb-4 pl-[7.5rem] text-caption font-medium text-muted-foreground hover:text-foreground"
                        >
                          View {reply.reply_count} {reply.reply_count === 1 ? "reply" : "replies"} <CaretRight weight="bold" className="size-3" />
                        </Link>
                      ) : null}
                    </div>
                  ))}
                  {child.reply_count > replies.length ? (
                    <Link
                      href={`/emr/${child.id}`}
                      className="-mt-2 flex items-center gap-1 pb-4 pl-[4.25rem] text-caption font-medium text-muted-foreground hover:text-foreground"
                    >
                      View all {child.reply_count} replies <CaretRight weight="bold" className="size-3" />
                    </Link>
                  ) : null}
                </BlurFade>
              );
            })}
          </section>
        ) : (
          <p className="mt-6 text-center text-body-sm text-muted-foreground">No replies yet. Be the first second opinion.</p>
        )}
      </BlurFade>
    </main>
  );
}
