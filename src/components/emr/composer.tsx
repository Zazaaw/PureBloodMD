"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ImageSquare, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { DoctorPhoto } from "@/components/doctor-photo";
import { Button } from "@/components/ui/button";
import { EMR_MAX_CHARS, EMR_MAX_PHOTOS } from "@/lib/constants";
import { IMAGE_ACCEPT, MAX_PICK_BYTES, isPickableImage, prepareImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import type { EmrImage } from "@/lib/types";
import { cn } from "@/lib/utils";


/** Database errors from enforce_emr_post, in plain words. */
const ERRORS: Record<string, string> = {
  slow_down: "You are posting faster than a code blue. Take a breath and try again later.",
  account_paused: "Your account is paused. Reactivate it in your Passport to post.",
  cannot_reply: "This post can no longer receive replies.",
  empty_post: "Write something or add a photo first.",
  bad_image: "One of the photos could not be attached. Try again.",
  unsupported_image: "One photo could not be read. Try a screenshot or a JPG instead.",
  upload_failed: "A photo failed to upload. Check your connection and try again.",
};

type Pending = { file: File; preview: string };

export type ComposerMe = { id: string; name: string; photo: string };

/**
 * Writes a thread (no parentId) or a reply. Photos are re-encoded in the
 * browser (EXIF and GPS stripped), uploaded to the private emr-media bucket,
 * then the row is inserted; the database fills in author, masking and limits.
 */
export function Composer({
  me,
  parentId,
  placeholder = "Chart something...",
  autoFocus,
  onPosted,
  className,
}: {
  me: ComposerMe;
  parentId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onPosted?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<Pending[]>([]);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const left = EMR_MAX_CHARS - body.length;
  const canPost = !posting && left >= 0 && (body.trim().length > 0 || photos.length > 0);

  // Grow with the text, like a real thread composer.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [body]);

  // Free the blob previews when the composer goes away (removePhoto frees single ones).
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const addPhotos = (files: FileList | null) => {
    // Copy first: resetting the input empties the live FileList it handed us.
    const picked = Array.from(files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    const room = EMR_MAX_PHOTOS - photos.length;
    if (picked.length > room) toast(`Up to ${EMR_MAX_PHOTOS} photos per post.`);
    const ok = picked.slice(0, Math.max(0, room)).filter((f) => {
      if (!isPickableImage(f)) return toast.error(`${f.name} is not a photo.`), false;
      if (f.size > MAX_PICK_BYTES) return toast.error("Max 50 MB per photo. This is a feed, not a PACS server."), false;
      return true;
    });
    setPhotos((prev) => [...prev, ...ok.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  };

  const removePhoto = (i: number) =>
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, j) => j !== i);
    });

  const submit = async () => {
    if (!canPost) return;
    setPosting(true);
    const supabase = createClient();
    try {
      const images: EmrImage[] = [];
      for (const p of photos) {
        const img = await prepareImage(p.file);
        const path = `${me.id}/${crypto.randomUUID()}.${img.ext}`;
        const { error } = await supabase.storage.from("emr-media").upload(path, img.blob, { contentType: img.type });
        if (error) throw new Error("upload_failed");
        images.push({ path, w: img.width, h: img.height });
      }
      const { error } = await supabase.from("emr_posts").insert({ body: body.trim(), images, parent_id: parentId ?? null });
      if (error) throw new Error(error.message);
      setBody("");
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      toast.success(parentId ? "Reply posted." : "Posted to EMR.");
      onPosted?.();
      router.refresh();
    } catch (e) {
      const code = Object.keys(ERRORS).find((k) => (e as Error).message?.includes(k));
      toast.error(code ? ERRORS[code] : "Could not post. Try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={cn("flex gap-3", className)}>
      <DoctorPhoto src={me.photo} alt="" size={40} className="size-10 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-semibold">{me.name}</p>
        <textarea
          ref={textRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder={placeholder}
          aria-label={parentId ? "Write a reply" : "Write a thread"}
          autoFocus={autoFocus}
          rows={1}
          maxLength={EMR_MAX_CHARS + 50}
          className="mt-0.5 block max-h-80 w-full resize-none bg-transparent text-body placeholder:text-muted-foreground focus-visible:outline-hidden"
        />

        {photos.length ? (
          <ul className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {photos.map((p, i) => (
              <li key={p.preview} className="relative size-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={p.preview} alt={`Photo ${i + 1} to post`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/90 text-foreground shadow-xs"
                >
                  <X weight="bold" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileRef.current?.click()}
            disabled={posting || photos.length >= EMR_MAX_PHOTOS}
            aria-label="Add photos"
            className="-ml-2 text-muted-foreground"
          >
            <ImageSquare className="size-5" />
          </Button>
          <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} multiple className="sr-only" tabIndex={-1} onChange={(e) => addPhotos(e.target.files)} />
          <div className="flex items-center gap-3">
            {body.length > EMR_MAX_CHARS - 80 ? (
              <span className={cn("text-caption tabular-nums", left < 0 ? "text-destructive" : "text-muted-foreground")}>{left}</span>
            ) : null}
            <Button type="button" size="sm" onClick={submit} disabled={!canPost} className="rounded-full px-4">
              {posting ? "Posting..." : parentId ? "Reply" : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
