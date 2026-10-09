"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChatCircle, Flag, HeartStraight, Repeat, SealCheck, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { DoctorPhoto } from "@/components/doctor-photo";
import { SafetyDialog } from "@/components/safety-dialog";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/time";
import type { EmrPost } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isVerified } from "@/lib/verified";
import { Composer, type ComposerMe } from "./composer";
import { EmrPhotos } from "./emr-photos";

type Props = {
  post: EmrPost;
  me: ComposerMe;
  /** "focus": the post a thread page is about (bigger text, no link to itself). */
  variant?: "feed" | "focus";
  /** Reply opens a composer under the card instead of linking to the thread page. */
  inlineReply?: boolean;
  /** Shown above the body on reply lists: "Replying to dr. X". */
  replyingTo?: { id: string; name: string } | null;
  /** Draws the thread line down from the avatar (a parent above its replies). */
  threadLine?: boolean;
  className?: string;
};

/** One EMR post: a thread in the feed, a comment, or a reply. */
export function PostCard({ post, me, variant = "feed", inlineReply, replyingTo, threadLine, className }: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.like_count);
  const [reposted, setReposted] = useState(post.reposted);
  const [reposts, setReposts] = useState(post.repost_count ?? 0);
  const [replying, setReplying] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [pending, startTransition] = useTransition();
  const mine = post.author_id === me.id;
  const focus = variant === "focus";
  const href = `/emr/${post.id}`;
  const profileHref = `/doctor/${post.author.id}`;

  const toggleLike = () => {
    // Optimistic: flip now, settle on the server's count.
    setLiked(!liked);
    setLikes((n) => n + (liked ? -1 : 1));
    startTransition(async () => {
      const { data, error } = await createClient().rpc("toggle_emr_like", { p_post: post.id });
      const row = (data as { liked: boolean; like_count: number }[] | null)?.[0];
      if (error || !row) {
        setLiked(liked);
        setLikes(post.like_count);
        return void toast.error("Could not like this post. Try again.");
      }
      setLiked(row.liked);
      setLikes(row.like_count);
    });
  };

  const toggleRepost = () => {
    setReposted(!reposted);
    setReposts((n) => n + (reposted ? -1 : 1));
    startTransition(async () => {
      const { data, error } = await createClient().rpc("toggle_emr_repost", { p_post: post.id });
      const row = (data as { reposted: boolean; repost_count: number }[] | null)?.[0];
      if (error || !row) {
        setReposted(reposted);
        setReposts(post.repost_count ?? 0);
        return void toast.error("Could not repost. Try again.");
      }
      setReposted(row.reposted);
      setReposts(row.repost_count);
      toast.success(row.reposted ? "Reposted to your profile." : "Repost removed.");
    });
  };

  const remove = () => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    startTransition(async () => {
      const { error } = await createClient().rpc("delete_emr_post", { p_post: post.id });
      if (error) return void toast.error("Could not delete. Try again.");
      toast.success("Post deleted.");
      if (focus && !post.parent_id) router.push("/emr");
      else router.refresh();
    });
  };

  if (post.deleted_at) {
    return (
      <article className={cn("flex gap-3 px-5 py-4", className)}>
        <span className="relative flex w-10 shrink-0 justify-center">
          <span className="size-10 rounded-full border border-dashed" />
          {threadLine ? <span aria-hidden className="absolute bottom-[-1rem] top-12 w-0.5 rounded-full bg-border" /> : null}
        </span>
        <p className="self-center text-body-sm italic text-muted-foreground">This post was removed by the author.</p>
      </article>
    );
  }

  const name = post.author.display_name;
  const body = (
    <p className={cn("whitespace-pre-wrap break-words", focus ? "mt-3 text-lead" : "mt-0.5 text-body")}>{post.body}</p>
  );

  return (
    <article className={cn("flex gap-3 px-5 py-4", className)}>
      <span className="relative flex shrink-0 flex-col items-center">
        <Link href={profileHref} aria-label={`${name}'s profile`} className="rounded-full">
          <DoctorPhoto src={post.author.photo_url} fallback={post.author.photo_fallback_url} alt="" size={40} className="size-10" />
        </Link>
        {threadLine ? <span aria-hidden className="absolute bottom-[-1rem] top-12 w-0.5 rounded-full bg-border" /> : null}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <Link href={profileHref} className="min-w-0 truncate text-body-sm font-semibold hover:underline">
            {name}
          </Link>
          {isVerified(post.author) ? <SealCheck weight="fill" className="size-4 shrink-0 self-center text-sky-500" aria-label="Verified" /> : null}
          <span className="hidden min-w-0 truncate text-caption text-muted-foreground sm:inline">{post.author.specialty_title}</span>
          <time dateTime={post.created_at} suppressHydrationWarning className="ml-auto shrink-0 text-caption text-muted-foreground tabular-nums">
            {timeAgo(post.created_at)}
          </time>
        </div>

        {replyingTo ? (
          <p className="text-caption text-muted-foreground">
            Replying to{" "}
            <Link href={`/doctor/${replyingTo.id}`} className="font-medium text-foreground hover:underline">
              {replyingTo.name}
            </Link>
          </p>
        ) : null}

        {post.body ? (focus ? body : <Link href={href} className="block">{body}</Link>) : null}
        <EmrPhotos images={post.images} urls={post.urls} author={name} />

        <div className="-ml-2 mt-2 flex items-center gap-1 text-muted-foreground">
          <button
            type="button"
            onClick={toggleLike}
            disabled={pending}
            aria-pressed={liked}
            aria-label={liked ? "Unlike" : "Like"}
            className={cn("flex h-9 items-center gap-1.5 rounded-full px-2 text-body-sm transition-colors hover:bg-accent", liked && "text-primary")}
          >
            <HeartStraight weight={liked ? "fill" : "regular"} className={cn("size-5", liked && "animate-heartbeat [animation-iteration-count:1]")} />
            {likes > 0 ? <span className="tabular-nums">{likes}</span> : null}
          </button>

          {inlineReply ? (
            <button
              type="button"
              onClick={() => setReplying((r) => !r)}
              aria-expanded={replying}
              aria-label="Reply"
              className="flex h-9 items-center gap-1.5 rounded-full px-2 text-body-sm transition-colors hover:bg-accent"
            >
              <ChatCircle className="size-5" />
              {post.reply_count > 0 ? <span className="tabular-nums">{post.reply_count}</span> : null}
            </button>
          ) : (
            <Link href={href} aria-label={`Reply, ${post.reply_count} replies`} className="flex h-9 items-center gap-1.5 rounded-full px-2 text-body-sm transition-colors hover:bg-accent">
              <ChatCircle className="size-5" />
              {post.reply_count > 0 ? <span className="tabular-nums">{post.reply_count}</span> : null}
            </Link>
          )}

          {mine ? (
            reposts > 0 ? (
              <span className="flex h-9 items-center gap-1.5 px-2 text-body-sm" aria-label={`${reposts} reposts`}>
                <Repeat className="size-5" /> <span className="tabular-nums">{reposts}</span>
              </span>
            ) : null
          ) : (
            <button
              type="button"
              onClick={toggleRepost}
              disabled={pending}
              aria-pressed={reposted}
              aria-label={reposted ? "Undo repost" : "Repost"}
              className={cn("flex h-9 items-center gap-1.5 rounded-full px-2 text-body-sm transition-colors hover:bg-accent", reposted && "text-emerald-500")}
            >
              <Repeat weight={reposted ? "bold" : "regular"} className="size-5" />
              {reposts > 0 ? <span className="tabular-nums">{reposts}</span> : null}
            </button>
          )}

          {mine ? (
            <button type="button" onClick={remove} disabled={pending} aria-label="Delete post" className="ml-auto grid size-9 place-items-center rounded-full transition-colors hover:bg-accent hover:text-destructive">
              <Trash className="size-4" />
            </button>
          ) : (
            <button type="button" onClick={() => setReporting(true)} aria-label={`Report post by ${name}`} className="ml-auto grid size-9 place-items-center rounded-full transition-colors hover:bg-accent">
              <Flag className="size-4" />
            </button>
          )}
        </div>

        {replying ? (
          <Composer
            me={me}
            parentId={post.id}
            placeholder={`Reply to ${name}...`}
            autoFocus
            onPosted={() => setReplying(false)}
            className="mt-3 rounded-xl border bg-muted/40 p-4"
          />
        ) : null}
      </div>

      {!mine ? (
        <SafetyDialog
          open={reporting}
          onClose={() => setReporting(false)}
          target={{ id: post.author.id, name }}
          mode="report"
          onBlocked={() => router.refresh()}
        />
      ) : null}
    </article>
  );
}
