"use client";

import { useRef, useState } from "react";
import { CaretLeft, CaretRight, Ear, HeartStraight, Lightning, MapPin, SealCheck } from "@phosphor-icons/react";
import { DoctorPhoto } from "@/components/doctor-photo";
import { FounderBadge } from "@/components/founder-badge";
import { Badge } from "@/components/ui/badge";
import { sounds } from "@/lib/sounds";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isVerified } from "@/lib/verified";

export type CardDoctor = Pick<
  Profile,
  | "display_name" | "age" | "specialty_title" | "hospital" | "status_text" | "distance_km"
  | "photo_url" | "photo_fallback_url" | "caffeine" | "stamina" | "manner" | "bio" | "tags"
> &
  Partial<Pick<Profile, "gallery" | "identity_verified" | "doctor_verified" | "superliked_me" | "is_founder">>;

/** Swipeable photo strip (scroll-snap), with dots and tap zones on desktop. */
function PhotoCarousel({ doc, priority }: { doc: CardDoctor; priority?: boolean }) {
  const photos = [doc.photo_url, ...(doc.gallery ?? [])].filter(Boolean);
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const next = Math.max(0, Math.min(photos.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  return (
    <>
      <div
        ref={scroller}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        aria-label={`${doc.display_name}'s photos`}
      >
        {photos.map((src, i) => (
          <div key={src + i} className="relative h-full w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`Photo ${i + 1} of ${photos.length}`}>
            <DoctorPhoto
              src={src}
              fallback={i === 0 ? doc.photo_fallback_url : null}
              alt={i === 0 ? doc.display_name : `${doc.display_name}, photo ${i + 1}`}
              fill
              priority={priority && i === 0}
            />
          </div>
        ))}
      </div>
      {photos.length > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-x-4 top-2 z-10 flex gap-1" aria-hidden>
            {photos.map((_, i) => (
              <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-200", i === index ? "bg-white" : "bg-white/35")} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-opacity duration-200 disabled:opacity-0 sm:grid"
          >
            <CaretLeft weight="bold" className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === photos.length - 1}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-opacity duration-200 disabled:opacity-0 sm:grid"
          >
            <CaretRight weight="bold" className="size-4" />
          </button>
        </>
      ) : null}
    </>
  );
}

/** Photos switched by tapping the left/right third (Stories style), so horizontal drags stay free for swiping. */
function TapPhotos({ doc, priority }: { doc: CardDoctor; priority?: boolean }) {
  const photos = [doc.photo_url, ...(doc.gallery ?? [])].filter(Boolean);
  const [index, setIndex] = useState(0);
  return (
    <>
      {photos.map((src, i) => (
        <div
          key={src + i}
          className={cn("absolute inset-0 transition-opacity duration-200", i === index ? "opacity-100" : "opacity-0")}
          aria-hidden={i !== index}
        >
          <DoctorPhoto
            src={src}
            fallback={i === 0 ? doc.photo_fallback_url : null}
            alt={i === 0 ? doc.display_name : `${doc.display_name}, photo ${i + 1}`}
            fill
            priority={priority && i === 0}
          />
        </div>
      ))}
      {photos.length > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-x-4 top-2 z-10 flex gap-1" aria-hidden>
            {photos.map((_, i) => (
              <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-200", i === index ? "bg-white" : "bg-white/35")} />
            ))}
          </div>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="absolute inset-y-0 left-0 z-[5] w-1/3 cursor-w-resize"
          />
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => setIndex((i) => Math.min(photos.length - 1, i + 1))}
            className="absolute inset-y-0 right-0 z-[5] w-1/3 cursor-e-resize"
          />
        </>
      ) : null}
    </>
  );
}

/** Photo strip with status, distance, Superliked ribbon and the name overlay. Caller sets the size. */
export function DoctorPhotoPanel({
  doc,
  online = false,
  priority,
  className,
  tapNav = false,
  nameClassName,
  children,
}: {
  doc: CardDoctor;
  online?: boolean;
  priority?: boolean;
  className?: string;
  /** Tap left/right to change photo instead of scrolling (for the swipe deck). */
  tapNav?: boolean;
  nameClassName?: string;
  /** Extra overlays (swipe stamps, buttons) drawn above the photo. */
  children?: React.ReactNode;
}) {
  const verified = isVerified(doc);
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {doc.photo_url ? (tapNav ? <TapPhotos doc={doc} priority={priority} /> : <PhotoCarousel doc={doc} priority={priority} />) : null}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/5 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-4 pt-5">
        <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-caption font-semibold text-white backdrop-blur">
          <span
            className={cn("size-2 shrink-0 rounded-full", online ? "bg-emerald-400" : "bg-neutral-400")}
            role="img"
            aria-label={online ? "Online" : "Offline"}
            title={online ? "Online" : "Offline"}
          />
          {doc.status_text}
        </span>
        {doc.distance_km != null ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/55 px-3 py-1 font-mono text-caption text-white tabular-nums backdrop-blur">
            <MapPin weight="fill" className="size-3.5" /> {Number(doc.distance_km).toFixed(1)} km
          </span>
        ) : null}
      </div>
      {doc.superliked_me ? (
        <span className="pointer-events-none absolute left-1/2 top-14 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-caption font-bold text-neutral-900 shadow-sm">
          <Lightning weight="fill" className="size-3.5" /> Superliked you
        </span>
      ) : null}
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 z-10 p-5 text-white", nameClassName)}>
        {/* Names are never truncated (skill-typography): long ones wrap instead. */}
        <h2 className="text-h5 font-bold text-balance">
          {doc.display_name}
          <span className="ml-2 whitespace-nowrap font-normal text-white/80 tabular-nums">
            {doc.age}
            {verified ? (
              <SealCheck
                weight="fill"
                className="ml-1.5 inline size-5 align-[-0.15em] text-sky-300"
                aria-label="Verified: ID and medical license checked"
              />
            ) : null}
          </span>
        </h2>
        {doc.is_founder ? <FounderBadge variant="overlay" className="my-1" /> : null}
        <p className="font-medium text-white/90">{doc.specialty_title}</p>
        <p className="text-body-sm text-white/80">{doc.hospital}</p>
      </div>
      {children}
    </div>
  );
}

/** Auscultate button, vitals, bio and tags: everything below the photo. */
export function DoctorDetails({ doc }: { doc: CardDoctor }) {
  const [listening, setListening] = useState(false);
  const auscultate = () => {
    sounds.heartbeat();
    setListening(true);
    setTimeout(() => setListening(false), 1800);
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={auscultate}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-left transition-colors duration-200 hover:bg-primary/10"
      >
        <span className="flex items-center gap-2 text-body-sm font-medium">
          <Ear className="size-5 shrink-0 text-primary" /> Auscultate S1/S2 heartbeat
        </span>
        <span className="flex shrink-0 items-center gap-1 text-caption font-semibold text-primary">
          <HeartStraight weight="fill" className={cn("size-4", listening && "animate-heartbeat")} />
          {listening ? "Lub-dub…" : "Listen"}
        </span>
      </button>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Caffeine", doc.caffeine],
          ["Call stamina", doc.stamina],
          ["Bedside manner", doc.manner],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-lg bg-muted px-1.5 py-2.5 break-words">
            <dt className="text-overline font-semibold uppercase text-muted-foreground">{k}</dt>
            <dd className={cn("mt-1 text-caption font-semibold", !v && "font-normal text-muted-foreground")}>{v ? v.replace(/\//g, "/\u200B") : "Not charted"}</dd>
          </div>
        ))}
      </dl>

      {doc.bio ? (
        <figure className="rounded-lg border-l-2 border-primary bg-muted/50 px-4 py-3">
          <figcaption className="text-overline font-semibold uppercase text-primary">℞ Official clinical prescription</figcaption>
          <blockquote className="mt-1 text-body-sm">“{doc.bio}”</blockquote>
        </figure>
      ) : null}

      {doc.tags.length ? (
        <div className="flex flex-wrap gap-2">
          {doc.tags.map((t) => (
            <Badge key={t} variant="secondary" className="font-medium">{t}</Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The stacked card: Passport self-preview and anywhere a single tall card fits. */
export function DoctorCard({
  doc,
  online = false,
  className,
  priority,
}: {
  doc: CardDoctor;
  online?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <article className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", doc.superliked_me && "border-amber-500/60 ring-2 ring-amber-500/30", className)}>
      <DoctorPhotoPanel doc={doc} online={online} priority={priority} className="aspect-[4/5]" />
      <div className="p-5">
        <DoctorDetails doc={doc} />
      </div>
    </article>
  );
}
