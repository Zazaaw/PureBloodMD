import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardText, ImageSquare } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { DoctorPhoto } from "@/components/doctor-photo";
import { StatusPill } from "@/components/status-pill";
import { requireProfile } from "@/lib/auth";
import { SectionHero } from "../hero";
import { timeAgo } from "@/lib/time";
import { RpcButton } from "../ban-dialog";

export const metadata: Metadata = { title: "EMR moderation" };

type Post = {
  id: string; body: string; images: { path: string }[]; parent_id: string | null; like_count: number; reply_count: number; created_at: string;
  author_id: string; author_name: string; author_photo: string; author_is_bot: boolean;
};

/** Latest EMR posts and replies, members first in mind: open, judge, remove. */
export default async function AdminEmrPage({ searchParams }: { searchParams: Promise<{ members?: string }> }) {
  const { supabase } = await requireProfile();
  const { members } = await searchParams;
  const { data } = await supabase.rpc("admin_list_emr", { p_limit: 200 });
  const all = (data ?? []) as Post[];
  const rows = members === "0" ? all : all.filter((p) => !p.author_is_bot);
  const paths = rows.flatMap((p) => p.images.map((i) => i.path)).slice(0, 200);
  const { data: signed } = paths.length ? await supabase.storage.from("emr-media").createSignedUrls(paths, 900) : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl ?? undefined]));

  return (
    <BlurFade>
      <SectionHero
        icon={<ClipboardText weight="fill" />}
        eyebrow="Community"
        title="EMR moderation"
        subtitle="Newest posts and replies. Remove anything with patient data, harassment, scams or spam; it is logged."
        chips={[
          { label: "posts shown", value: rows.length, tone: "muted" },
          { label: "with photos", value: rows.filter((p) => p.images.length).length, tone: "muted" },
        ]}
        action={
          <Link href={members === "0" ? "/admin/emr" : "/admin/emr?members=0"} className="text-body-sm font-medium text-muted-foreground underline-offset-4 hover:underline">
            {members === "0" ? "Members only" : "Include demo bots"}
          </Link>
        }
      />
      {rows.length === 0 ? (
        <div className="rounded-xl border py-16 text-center"><p className="font-semibold">No member posts yet.</p></div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card shadow-sm">
          {rows.map((p) => (
            <li key={p.id} className="flex gap-3 px-4 py-4 sm:px-5">
              <Link href={`/admin/users/${p.author_id}`} className="shrink-0"><DoctorPhoto src={p.author_photo} alt="" size={40} className="size-10" /></Link>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-body-sm">
                  <Link href={`/admin/users/${p.author_id}`} className="font-semibold hover:underline">{p.author_name}</Link>
                  {p.author_is_bot ? <StatusPill status="neutral">bot</StatusPill> : null}
                  {p.parent_id ? <span className="text-caption text-muted-foreground">reply</span> : null}
                  <span className="ml-auto text-caption text-muted-foreground" suppressHydrationWarning>{timeAgo(p.created_at)}</span>
                </p>
                <Link href={`/emr/${p.id}`} className="mt-0.5 block whitespace-pre-wrap break-words text-body-sm hover:opacity-80">{p.body || "[photo]"}</Link>
                {p.images.length ? (
                  <div className="mt-2 flex gap-2">
                    {p.images.map((img) => (
                      <a key={img.path} href={urlFor.get(img.path)} target="_blank" rel="noreferrer" className="block size-16 overflow-hidden rounded-lg border bg-muted">
                        {urlFor.get(img.path) ? (
                          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                          <img src={urlFor.get(img.path)} alt="" className="size-full object-cover" />
                        ) : <ImageSquare className="m-auto size-5 text-muted-foreground" />}
                      </a>
                    ))}
                  </div>
                ) : null}
                <p className="mt-1 text-caption text-muted-foreground tabular-nums">{p.like_count} likes · {p.reply_count} replies</p>
              </div>
              <RpcButton fn="admin_delete_emr_post" args={{ p_post: p.id, p_reason: "Removed by moderator" }} label="Remove" done="Post removed." size="sm" variant="ghost" confirm="Remove this post for everyone?" />
            </li>
          ))}
        </ul>
      )}
    </BlurFade>
  );
}
