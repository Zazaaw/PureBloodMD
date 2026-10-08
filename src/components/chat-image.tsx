"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { EyeSlash, ImageBroken } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Signed URLs live for an hour; cache them so re-renders do not re-sign.
const cache = new Map<string, { url: string; until: number }>();

async function signedUrl(path: string) {
  const hit = cache.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const { data, error } = await createClient().storage.from("chat-media").createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error("no url");
  cache.set(path, { url: data.signedUrl, until: Date.now() + 55 * 60_000 });
  return data.signedUrl;
}

/**
 * A private chat photo. Photos from the other doctor arrive blurred until you
 * tap them: nobody should be ambushed by an explicit image.
 */
export function ChatImage({
  path,
  width,
  height,
  mine,
}: {
  path: string;
  width: number | null;
  height: number | null;
  mine: boolean;
}) {
  const [url, setUrl] = useState<string | null>(cache.get(path)?.url ?? null);
  const [failed, setFailed] = useState(false);
  const [revealed, setRevealed] = useState(mine);

  useEffect(() => {
    let alive = true;
    signedUrl(path)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [path]);

  const w = width ?? 800;
  const h = height ?? 800;

  return (
    <div
      className="relative w-64 max-w-full overflow-hidden rounded-xl border bg-muted"
      style={{ aspectRatio: `${w} / ${h}`, maxHeight: "22rem" }}
    >
      {failed ? (
        <span className="absolute inset-0 grid place-items-center text-caption text-muted-foreground">
          <ImageBroken className="size-6" />
        </span>
      ) : url ? (
        <Image
          src={url}
          alt={mine ? "Photo you sent" : "Photo received"}
          fill
          unoptimized
          sizes="256px"
          className={cn("object-cover transition-[filter] duration-300", !revealed && "scale-110 blur-2xl")}
        />
      ) : (
        <span className="absolute inset-0 animate-pulse bg-foreground/10" />
      )}
      {!revealed && url ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 text-white"
        >
          <EyeSlash className="size-6" />
          <span className="text-caption font-semibold">Tap to view photo</span>
        </button>
      ) : null}
    </div>
  );
}
