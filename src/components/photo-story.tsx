"use client";

import { useEffect, useRef, useState } from "react";
import { SealCheck, X } from "@phosphor-icons/react";
import { DoctorPhoto } from "@/components/doctor-photo";
import { FounderBadge } from "@/components/founder-badge";
import { cn } from "@/lib/utils";

export type StoryPerson = {
  id: string;
  name: string;
  subtitle?: string;
  photo: string;
  fallback?: string | null;
  gallery?: string[] | null;
  verified?: boolean;
  founder?: boolean;
};

const STORY_MS = 5000;
const SEEN_KEY = "pbmd-story-seen";

export const storyPhotos = (p: StoryPerson) => [p.photo, ...(p.gallery ?? [])].filter(Boolean);
/** Changes when they change their photos, so the ring lights up again. */
const signature = (p: StoryPerson) => storyPhotos(p).join("|");

function readSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Which people's photo stories this browser has already watched (Instagram-style ring). */
export function useStorySeen() {
  const [seen, setSeen] = useState<Record<string, string>>({});
  useEffect(() => {
    const t = setTimeout(() => setSeen(readSeen()), 0);
    return () => clearTimeout(t);
  }, []);
  const isSeen = (p: StoryPerson) => seen[p.id] === signature(p);
  const markSeen = (p: StoryPerson) => {
    const next = { ...readSeen(), [p.id]: signature(p) };
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    } catch {}
    setSeen(next);
  };
  return { isSeen, markSeen };
}

/**
 * Full-screen photo viewer. Story mode (`autoAdvance`) plays each photo for 5 s and
 * closes after the last; otherwise it waits for taps so people can look as long as
 * they like. Tap the left third for back, the rest for next, hold to pause, Esc to close.
 */
export function PhotoStory({
  person,
  open,
  onClose,
  startAt = 0,
  autoAdvance = false,
  actions,
}: {
  person: StoryPerson;
  open: boolean;
  onClose: () => void;
  startAt?: number;
  autoAdvance?: boolean;
  /** Buttons at the bottom, e.g. "Open chat". */
  actions?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const photos = storyPhotos(person);
  const [index, setIndex] = useState(startAt);
  const [paused, setPaused] = useState(false);
  const pressedAt = useRef(0);

  // Reset to the requested photo each time it opens (state adjusted during render).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setIndex(Math.min(startAt, photos.length - 1));
      setPaused(false);
    }
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const next = () => (index < photos.length - 1 ? setIndex(index + 1) : autoAdvance ? onClose() : undefined);
  const prev = () => setIndex(Math.max(0, index - 1));

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  };

  return (
    <dialog
      ref={ref}
      aria-label={`${person.name}'s photos`}
      onClose={onClose}
      onKeyDown={onKey}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-black p-0 text-white backdrop:bg-black open:animate-in open:fade-in-0"
    >
      {open ? (
        <div className="relative mx-auto flex h-full max-w-lg flex-col">
          {/* Photo + tap zones */}
          <div
            className="relative min-h-0 flex-1 touch-none select-none"
            onPointerDown={() => {
              pressedAt.current = Date.now();
              setPaused(true);
            }}
            onPointerUp={(e) => {
              setPaused(false);
              if (Date.now() - pressedAt.current > 250) return; // a hold, not a tap
              const box = e.currentTarget.getBoundingClientRect();
              if (e.clientX - box.left < box.width / 3) prev();
              else next();
            }}
            onPointerCancel={() => setPaused(false)}
          >
            {photos.map((src, i) => (
              <div key={src + i} className={cn("absolute inset-0 transition-opacity duration-200", i === index ? "opacity-100" : "opacity-0")} aria-hidden={i !== index}>
                <DoctorPhoto
                  src={src}
                  fallback={i === 0 ? person.fallback : null}
                  alt={i === 0 ? person.name : `${person.name}, photo ${i + 1}`}
                  fill
                  sizes="(max-width: 512px) 100vw, 512px"
                  priority={i === index}
                  className="object-contain"
                />
              </div>
            ))}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/70 to-transparent" />
          </div>

          {/* Progress + header */}
          <div className="absolute inset-x-0 top-0 px-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
            <div className="flex gap-1" aria-hidden>
              {photos.map((_, i) => (
                <span key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                  {i < index ? <span className="block h-full w-full bg-white" /> : null}
                  {i === index ? (
                    autoAdvance ? (
                      <span
                        key={`${index}-${open}`}
                        className="block h-full bg-white"
                        style={{ animation: `story-fill ${STORY_MS}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }}
                        onAnimationEnd={next}
                      />
                    ) : (
                      <span className="block h-full w-full bg-white" />
                    )
                  ) : null}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <DoctorPhoto src={person.photo} fallback={person.fallback} alt="" size={36} className="size-9 ring-1 ring-white/40" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-body-sm font-semibold leading-tight">
                  <span className="truncate">{person.name}</span>
                  {person.verified ? <SealCheck weight="fill" className="size-4 shrink-0 text-sky-400" aria-label="Verified" /> : null}
                  {person.founder ? <FounderBadge /> : null}
                </p>
                {person.subtitle ? <p className="truncate text-caption text-white/70">{person.subtitle}</p> : null}
              </div>
              <span className="font-mono text-caption text-white/70 tabular-nums">
                {index + 1}/{photos.length}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close photos"
                className="grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-200 hover:bg-white/10"
              >
                <X className="size-6" />
              </button>
            </div>
          </div>

          {actions ? <div className="flex gap-2 bg-black px-4 pt-3" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>{actions}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}

/** A photo (or anything) that opens the viewer when tapped. For server pages. */
export function PhotoStoryButton({
  person,
  startAt = 0,
  className,
  label,
  children,
}: {
  person: StoryPerson;
  startAt?: number;
  className?: string;
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label ?? `View ${person.name}'s photos`}
        className={cn("cursor-zoom-in rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring", className)}
      >
        {children}
      </button>
      <PhotoStory person={person} open={open} startAt={startAt} onClose={() => setOpen(false)} />
    </>
  );
}
