"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Camera, Plus, Star, X } from "@phosphor-icons/react";
import { IMAGE_ACCEPT, MAX_PICK_BYTES, isPickableImage, prepareImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const SLOTS = 4;

/**
 * Up to 4 profile photos. Slot 1 is the main photo (required); the rest are
 * optional and shown when people swipe through the card. Files go straight to
 * Supabase Storage (avatars/<userId>/...), the form receives the public URLs
 * through hidden inputs: `photo_url` and repeated `gallery`.
 */
export function GalleryUpload({
  userId,
  initial = [],
  error,
  onChange,
}: {
  userId: string;
  initial?: string[];
  error?: string;
  onChange?: (urls: string[]) => void;
}) {
  const [urls, setUrls] = useState<string[]>(initial.filter(Boolean).slice(0, SLOTS));
  const [busy, setBusy] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const target = useRef(0);

  const update = (next: string[]) => {
    setUrls(next);
    onChange?.(next);
  };

  const pick = (slot: number) => {
    target.current = slot;
    inputRef.current?.click();
  };

  const upload = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setLocalError(null);
    if (!isPickableImage(file)) return setLocalError("That file is not a photo.");
    if (file.size > MAX_PICK_BYTES) return setLocalError("Max 50 MB per photo. This is a dating app, not a CT scan.");
    const slot = Math.min(target.current, urls.length);
    setBusy(slot);
    // Shrink + re-encode in the browser: big phone photos and HEIC work, and EXIF/GPS is stripped.
    let img: Awaited<ReturnType<typeof prepareImage>>;
    try {
      img = await prepareImage(file, 1600);
    } catch {
      setBusy(null);
      return setLocalError("This photo could not be read. Try a screenshot or a JPG.");
    }
    const path = `${userId}/${crypto.randomUUID()}.${img.ext}`;
    const supabase = createClient();
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, img.blob, { contentType: img.type });
    setBusy(null);
    if (upErr) return setLocalError("Upload failed. Try another photo.");
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const next = [...urls];
    next[slot] = url;
    update(next.filter(Boolean));
  };

  const remove = (slot: number) => update(urls.filter((_, i) => i !== slot));
  const makeMain = (slot: number) => update([urls[slot], ...urls.filter((_, i) => i !== slot)]);

  const shown = localError ?? error;

  return (
    <div className="grid gap-2">
      <span className="text-body-sm font-medium">Photos (1 required, up to 4)</span>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: SLOTS }).map((_, i) => {
          const url = urls[i];
          const isNext = i === urls.length;
          return (
            <div key={i} className="relative">
              <button
                type="button"
                onClick={() => pick(i)}
                disabled={busy !== null || (!url && !isNext)}
                aria-label={url ? `Replace photo ${i + 1}` : `Add photo ${i + 1}`}
                className={cn(
                  "relative block aspect-[4/5] w-full overflow-hidden rounded-xl border bg-muted transition-colors duration-200",
                  !url && isNext && "border-dashed hover:border-foreground/40",
                  !url && !isNext && "opacity-40",
                  busy === i && "animate-pulse"
                )}
              >
                {url ? (
                  <Image src={url} alt={`Your photo ${i + 1}`} fill sizes="120px" className="object-cover" unoptimized />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-muted-foreground">
                    {i === 0 ? <Camera className="size-6" /> : <Plus className="size-5" />}
                  </span>
                )}
                {i === 0 ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-caption font-semibold text-white">Main</span>
                ) : null}
              </button>
              {url ? (
                <div className="absolute right-1 top-1 flex gap-1">
                  {i > 0 ? (
                    <button
                      type="button"
                      onClick={() => makeMain(i)}
                      aria-label={`Make photo ${i + 1} the main photo`}
                      className="grid size-7 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <Star className="size-3.5" />
                    </button>
                  ) : null}
                  {urls.length > 1 || i > 0 ? (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="grid size-7 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="text-caption text-muted-foreground">A clear face photo first. Scrubs encouraged. People swipe sideways to see the rest.</p>
      <input ref={inputRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" aria-label="Choose a photo" onChange={(e) => upload(e.target.files?.[0])} />
      <input type="hidden" name="photo_url" value={urls[0] ?? ""} />
      {urls.slice(1).map((u) => (
        <input key={u} type="hidden" name="gallery" value={u} />
      ))}
      {shown ? <p role="alert" className="text-caption text-red-500">Error: {shown}</p> : null}
    </div>
  );
}
