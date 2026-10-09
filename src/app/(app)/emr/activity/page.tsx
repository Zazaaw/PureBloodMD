import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChatCircle, HeartStraight, Repeat } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { DoctorPhoto } from "@/components/doctor-photo";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { MarkRead } from "./mark-read";

export const metadata: Metadata = { title: "EMR activity" };

type Row = {
  id: number;
  kind: "like" | "reply" | "repost";
  created_at: string;
  read_at: string | null;
  post_id: string;
  actor: { id: string; display_name: string; photo_url: string; photo_fallback_url: string | null } | null;
  post: { id: string; body: string; images: unknown[] } | null;
  reply: { id: string; body: string } | null;
};

const KIND = {
  like: { icon: HeartStraight, verb: "liked your post", tone: "bg-primary text-primary-foreground" },
  reply: { icon: ChatCircle, verb: "replied to your post", tone: "bg-sky-500 text-white" },
  repost: { icon: Repeat, verb: "reposted your post", tone: "bg-emerald-500 text-white" },
} as const;

const snippet = (s: string | undefined | null, photos = 0) =>
  s?.trim() ? (s.length > 90 ? `${s.slice(0, 90).trimEnd()}…` : s) : photos ? "Photo" : "";

/** Everyone who liked, replied to or reposted my EMR posts, newest first. */
export default async function EmrActivityPage() {
  const { supabase } = await requireProfile();
  const { data } = await supabase
    .from("emr_notifications")
    .select(
      "id,kind,created_at,read_at,post_id," +
        "actor:profiles!actor_id(id,display_name,photo_url,photo_fallback_url)," +
        "post:emr_posts!post_id(id,body,images)," +
        "reply:emr_posts!reply_id(id,body)"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.actor && r.post);
  const hasUnread = rows.some((r) => !r.read_at);

  return (
    <main className="pb-dock mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:pb-10">
      <MarkRead hasUnread={hasUnread} />
      <BlurFade>
        <PageHeader
          title="Activity"
          subtitle="Who liked, replied to or reposted your EMR posts."
          action={
            <Button variant="outline" asChild>
              <Link href="/emr"><ArrowLeft /> EMR</Link>
            </Button>
          }
        />

        {rows.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
            <HeartStraight className="size-8 text-muted-foreground" />
            <p className="mt-4 font-semibold">No activity yet</p>
            <p className="mt-1 max-w-[36ch] text-body-sm text-muted-foreground">
              When someone likes, replies to or reposts your posts, it shows up here. Go chart something.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-xl border bg-card shadow-sm">
            {rows.map((r, i) => {
              const k = KIND[r.kind];
              const Icon = k.icon;
              return (
                <li key={r.id}>
                  <BlurFade inView delay={Math.min(i, 8) * 0.04}>
                    <Link
                      href={`/emr/${r.post_id}`}
                      className={cn("flex gap-3 px-5 py-4 transition-colors duration-200 hover:bg-accent", !r.read_at && "bg-primary/5")}
                    >
                      <span className="relative shrink-0">
                        <DoctorPhoto src={r.actor!.photo_url} fallback={r.actor!.photo_fallback_url} alt="" size={44} className="size-11" />
                        <span className={cn("absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full ring-2 ring-card", k.tone)}>
                          <Icon weight="fill" className="size-3" />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="min-w-0 text-body-sm">
                            <span className="font-semibold">{r.actor!.display_name}</span> {k.verb}
                          </span>
                          <time dateTime={r.created_at} suppressHydrationWarning className="ml-auto shrink-0 text-caption text-muted-foreground tabular-nums">
                            {timeAgo(r.created_at)}
                          </time>
                        </span>
                        {r.kind === "reply" && r.reply ? (
                          <span className="mt-0.5 block text-body-sm">“{snippet(r.reply.body)}”</span>
                        ) : null}
                        <span className="mt-0.5 block truncate text-caption text-muted-foreground">
                          {snippet(r.post!.body, r.post!.images?.length ?? 0)}
                        </span>
                      </span>
                      {!r.read_at ? <span aria-label="New" className="mt-2 size-2 shrink-0 rounded-full bg-primary" /> : null}
                    </Link>
                  </BlurFade>
                </li>
              );
            })}
          </ul>
        )}
      </BlurFade>
    </main>
  );
}
