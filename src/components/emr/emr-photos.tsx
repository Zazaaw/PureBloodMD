"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageBroken, X } from "@phosphor-icons/react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import type { EmrImage } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Post photos: one photo keeps its shape, several sit in a swipeable strip
 * (like Threads). Tap any photo to open it full size.
 */
export function EmrPhotos({ images, urls, author }: { images: EmrImage[]; urls: string[]; author: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!images.length) return null;
  const single = images.length === 1;

  return (
    <>
      <div
        className={cn(
          "mt-3 flex gap-2",
          !single && "-mr-5 overflow-x-auto overscroll-x-contain pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {images.map((img, i) => (
          <button
            key={img.path}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Open photo ${i + 1} of ${images.length} by ${author}`}
            className={cn(
              "relative shrink-0 overflow-hidden rounded-xl border bg-muted transition-opacity hover:opacity-90",
              single ? "max-h-[28rem] max-w-full" : "h-60"
            )}
            style={single ? { aspectRatio: `${img.w} / ${img.h}`, width: img.w >= img.h ? "100%" : "min(100%, 22rem)" } : { aspectRatio: `${Math.min(img.w / img.h, 1.4)}` }}
          >
            {urls[i] ? (
              <Image src={urls[i]} alt="" fill unoptimized sizes="(max-width: 640px) 100vw, 560px" className="object-cover" />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-muted-foreground"><ImageBroken className="size-6" /></span>
            )}
          </button>
        ))}
      </div>

      <Modal open={open !== null} onClose={() => setOpen(null)} labelledBy="emr-photo-title" className="max-w-3xl p-2">
        <h2 id="emr-photo-title" className="sr-only">Photo by {author}</h2>
        {open !== null && urls[open] ? (
          <div className="relative">
            <Image
              src={urls[open]}
              alt={`Photo ${open + 1} by ${author}`}
              width={images[open].w}
              height={images[open].h}
              unoptimized
              className="max-h-[80dvh] w-full rounded-lg object-contain"
            />
            <Button variant="secondary" size="icon" onClick={() => setOpen(null)} aria-label="Close photo" className="absolute right-2 top-2 rounded-full">
              <X />
            </Button>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
