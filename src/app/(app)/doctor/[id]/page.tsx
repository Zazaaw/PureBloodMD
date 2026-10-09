import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatCircleDots, ClipboardText, Hospital, ImageSquare, MapPin, PencilSimple, SealCheck } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { FounderBadge } from "@/components/founder-badge";
import { DoctorPhoto } from "@/components/doctor-photo";
import { PostCard } from "@/components/emr/post-card";
import { ProfileActions } from "@/components/emr/profile-actions";
import { PROFILE_TABS, type ProfileTab } from "@/components/emr/profile-tab-list";
import { ProfileTabs } from "@/components/emr/profile-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth";
import { SPECIALTIES, countryName } from "@/lib/constants";
import { EMR_PAGE, EMR_SELECT, UUID_RE, hydratePosts } from "@/lib/emr";
import type { Profile } from "@/lib/types";
import { isVerified } from "@/lib/verified";

export const metadata: Metadata = { title: "Doctor profile" };

// Public passport fields only. Credentials and coordinates live in other tables no member can read.
type PublicProfile = Pick<
  Profile,
  | "id" | "display_name" | "photo_url" | "photo_fallback_url" | "specialty" | "specialty_title" | "hospital" | "base_city"
  | "country" | "age" | "bio" | "tags" | "status_text" | "identity_verified" | "doctor_verified" | "deactivated_at" | "is_founder"
>;
const PROFILE_SELECT =
  "id,display_name,photo_url,photo_fallback_url,specialty,specialty_title,hospital,base_city,country,age,bio,tags,status_text,identity_verified,doctor_verified,deactivated_at,is_founder";

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
      <ClipboardText className="size-7 text-muted-foreground" />
      <p className="mt-3 text-body-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export default async function DoctorProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab: tabParam }] = await Promise.all([params, searchParams]);
  if (!UUID_RE.test(id)) notFound();
  const { supabase, profile: meProfile } = await requireProfile();
  const me = { id: meProfile.id, name: meProfile.display_name, photo: meProfile.photo_url };
  const isMe = id === meProfile.id;
  const tab: ProfileTab = PROFILE_TABS.find((t) => t.toLowerCase() === tabParam?.toLowerCase()) ?? "Threads";

  const [{ data: doc }, { data: blocked }] = await Promise.all([
    supabase.from("profiles").select(PROFILE_SELECT).eq("id", id).maybeSingle<PublicProfile>(),
    isMe ? Promise.resolve({ data: false }) : supabase.rpc("is_blocked_with", { p_other: id }),
  ]);
  // Blocked either way, or paused: the profile simply does not exist for you.
  if (!doc || blocked || (doc.deactivated_at && !isMe)) notFound();

  // Reposts: newest repost first, posts fetched in one go and put back in that order.
  const reposted = async () => {
    const { data: rp } = await supabase
      .from("emr_reposts")
      .select("post_id, created_at")
      .eq("profile_id", id)
      .order("created_at", { ascending: false })
      .limit(EMR_PAGE);
    const ids = (rp ?? []).map((r: { post_id: string }) => r.post_id);
    if (!ids.length) return { data: [] };
    const { data } = await supabase.from("emr_posts").select(EMR_SELECT).in("id", ids).is("deleted_at", null);
    const byId = new Map(((data ?? []) as unknown as { id: string }[]).map((p) => [p.id, p]));
    return { data: ids.map((x) => byId.get(x)).filter(Boolean) };
  };
  const own = () => supabase.from("emr_posts").select(EMR_SELECT).eq("author_id", id).is("deleted_at", null).order("created_at", { ascending: false });
  const count = (replies: boolean) => {
    const q = supabase.from("emr_posts").select("id", { count: "exact", head: true }).eq("author_id", id).is("deleted_at", null);
    return replies ? q.not("parent_id", "is", null) : q.is("parent_id", null);
  };

  const [{ count: threadCount }, { count: replyCount }, { data: match }, { data: rows }] = await Promise.all([
    count(false),
    count(true),
    isMe
      ? Promise.resolve({ data: null })
      : supabase
          .from("matches")
          .select("id")
          .or(`and(profile_a.eq.${meProfile.id},profile_b.eq.${id}),and(profile_a.eq.${id},profile_b.eq.${meProfile.id})`)
          .maybeSingle<{ id: string }>(),
    tab === "Threads" ? own().is("parent_id", null).limit(EMR_PAGE)
      : tab === "Replies" ? own().not("parent_id", "is", null).limit(EMR_PAGE)
      : tab === "Reposts" ? reposted()
      : own().limit(100),
  ]);

  const posts = await hydratePosts(supabase, meProfile.id, rows);
  const photoPosts = tab === "Photos" ? posts.filter((p) => p.images.length) : [];

  // Who each reply answers ("Replying to dr. X"). Parents you cannot see stay unnamed.
  const parentIds = tab === "Replies" ? [...new Set(posts.map((p) => p.parent_id).filter(Boolean))] as string[] : [];
  const { data: parents } = parentIds.length
    ? await supabase.from("emr_posts").select("id,author:profiles!author_id(id,display_name)").in("id", parentIds)
    : { data: [] };
  const parentAuthor = new Map(
    ((parents ?? []) as unknown as { id: string; author: { id: string; display_name: string } }[]).map((p) => [p.id, { id: p.author.id, name: p.author.display_name }])
  );

  const verified = isVerified(doc);
  const place = [doc.base_city, countryName(doc.country ?? "ID")].filter(Boolean).join(", ");

  return (
    <main className="pb-dock mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:pb-10">
      <BlurFade>
        <PageHeader title={isMe ? "Your profile" : "Doctor profile"} subtitle={isMe ? "This is how other doctors see you on EMR." : undefined} />

        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="min-w-0 flex-1">
              <h2 className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-h5 font-bold leading-tight">
                <span className="break-words">{doc.display_name}</span>
                {verified ? <SealCheck weight="fill" className="size-5 shrink-0 text-sky-500" aria-label="Verified" /> : null}
                {doc.is_founder ? <FounderBadge /> : null}
              </h2>
              <p className="mt-1 text-body-sm">
                <span className="font-mono">{SPECIALTIES[doc.specialty]?.code}</span> {doc.specialty_title}
              </p>
              <ul className="mt-3 space-y-1 text-body-sm text-muted-foreground">
                <li className="flex items-start gap-2"><Hospital className="mt-0.5 size-4 shrink-0" /> <span className="break-words">{doc.hospital}</span></li>
                <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0" /> {place}</li>
              </ul>
            </div>
            <DoctorPhoto src={doc.photo_url} fallback={doc.photo_fallback_url} alt={doc.display_name} size={88} className="size-20 shrink-0 sm:size-22" priority />
          </div>

          {doc.status_text ? <p className="mt-5 text-body-sm italic text-muted-foreground">&ldquo;{doc.status_text}&rdquo;</p> : null}
          {doc.bio ? <p className="mt-3 whitespace-pre-wrap break-words text-body">{doc.bio}</p> : null}
          {doc.tags?.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {doc.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
            </div>
          ) : null}

          <p className="mt-5 text-body-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{threadCount ?? 0}</span> threads
            <span aria-hidden> · </span>
            <span className="font-semibold text-foreground tabular-nums">{replyCount ?? 0}</span> replies
          </p>

          <div className="mt-5 flex items-center gap-2">
            {isMe ? (
              <Button variant="outline" asChild className="flex-1">
                <Link href="/passport"><PencilSimple /> Edit passport</Link>
              </Button>
            ) : (
              <>
                {match ? (
                  <Button asChild className="flex-1">
                    <Link href={`/chat/${match.id}`}><ChatCircleDots /> Open consult</Link>
                  </Button>
                ) : (
                  <Button variant="outline" asChild className="flex-1">
                    <Link href="/discover">Find in triage</Link>
                  </Button>
                )}
                <ProfileActions target={{ id: doc.id, name: doc.display_name }} />
              </>
            )}
          </div>
        </section>

        <div className="mt-6">
          <ProfileTabs value={tab} />
        </div>

        <div className="mt-4">
          {tab === "Photos" ? (
            photoPosts.length ? (
              <ul className="grid grid-cols-3 gap-1.5">
                {photoPosts.flatMap((p) =>
                  p.images.map((img, i) => (
                    <li key={img.path}>
                      <Link href={`/emr/${p.id}`} aria-label={`Open post with photo ${i + 1}`} className="relative block aspect-square overflow-hidden rounded-lg border bg-muted">
                        {p.urls[i] ? (
                          <Image src={p.urls[i]} alt="" fill unoptimized sizes="200px" className="object-cover transition-transform duration-300 hover:scale-105" />
                        ) : (
                          <ImageSquare className="absolute inset-0 m-auto size-6 text-muted-foreground" />
                        )}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <Empty>{isMe ? "Photos you post on EMR show up here." : "No photos yet."}</Empty>
            )
          ) : posts.length ? (
            <div className="divide-y rounded-xl border bg-card shadow-sm">
              {posts.map((post, i) => (
                <BlurFade key={post.id} inView delay={Math.min(i, 6) * 0.05}>
                  <PostCard post={post} me={me} replyingTo={tab === "Replies" && post.parent_id ? parentAuthor.get(post.parent_id) ?? null : null} />
                </BlurFade>
              ))}
            </div>
          ) : (
            <Empty>
              {tab === "Threads"
                ? isMe ? "You have not posted a thread yet. Your chart is still blank." : "No threads yet. Quiet on the ward."
                : tab === "Reposts"
                  ? isMe ? "Posts you repost show up here." : "No reposts yet."
                  : isMe ? "Your replies to other doctors show up here." : "No replies yet."}
            </Empty>
          )}
        </div>
      </BlurFade>
    </main>
  );
}
