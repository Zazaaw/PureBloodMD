import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { EmrPost } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Columns of every EMR post, with the author embedded (profiles are readable by members). */
export const EMR_SELECT =
  "id,author_id,parent_id,root_id,body,images,reply_count,like_count,repost_count,deleted_at,created_at," +
  "author:profiles!author_id(id,display_name,photo_url,photo_fallback_url,specialty_title,identity_verified,doctor_verified)";

export const EMR_PAGE = 30;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Adds my likes and signed photo URLs (private bucket, one batch call per page). */
export async function hydratePosts(supabase: Supabase, meId: string, rows: unknown[] | null): Promise<EmrPost[]> {
  const posts = (rows ?? []) as Omit<EmrPost, "liked" | "reposted" | "urls">[];
  if (!posts.length) return [];

  const paths = [...new Set(posts.flatMap((p) => p.images.map((i) => i.path)))];
  const ids = posts.map((p) => p.id);
  const [{ data: likes }, { data: reposts }, { data: signed }] = await Promise.all([
    supabase.from("emr_likes").select("post_id").eq("profile_id", meId).in("post_id", ids),
    supabase.from("emr_reposts").select("post_id").eq("profile_id", meId).in("post_id", ids),
    paths.length ? supabase.storage.from("emr-media").createSignedUrls(paths, 3600) : Promise.resolve({ data: [] }),
  ]);

  const liked = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));
  const reposted = new Set((reposts ?? []).map((r: { post_id: string }) => r.post_id));
  const urls = new Map((signed ?? []).filter((s) => s.signedUrl && s.path).map((s) => [s.path as string, s.signedUrl]));
  return posts.map((p) => ({ ...p, liked: liked.has(p.id), reposted: reposted.has(p.id), urls: p.images.map((i) => urls.get(i.path) ?? "") }));
}
