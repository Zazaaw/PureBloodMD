"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ArrowFatLeft, ArrowFatRight, ArrowFatUp, type Icon } from "@phosphor-icons/react";
import { DoctorPhoto } from "@/components/doctor-photo";
import { cn } from "@/lib/utils";
import type { LandingDoctor } from "./doctors";

type Dir = "right" | "left" | "super";

const SEQUENCE: Dir[] = ["right", "left", "super"];
const STAMP_MS = 900;
const CYCLE_MS = 2600;

const GESTURES: { dir: Dir; icon: Icon; label: string; body: string }[] = [
  { dir: "right", icon: ArrowFatRight, label: "Prescribed", body: "Swipe right to like. If they like you back, it's a match." },
  { dir: "left", icon: ArrowFatLeft, label: "Discharged", body: "Swipe left to pass. Changed your mind? Rewind once a day." },
  { dir: "super", icon: ArrowFatUp, label: "Defibrillated", body: "Swipe up for a Super Like. You land first in their deck." },
];

// Same stamps as the real deck in /discover, so the demo looks like the app.
const STAMPS: Record<Dir, { text: string; className: string }> = {
  right: { text: "PRESCRIBED", className: "left-4 top-12 -rotate-12 border-primary text-primary" },
  left: { text: "DISCHARGED", className: "right-4 top-12 rotate-12 border-white text-white" },
  super: { text: "DEFIBRILLATED", className: "inset-x-0 top-1/3 mx-auto w-fit -rotate-6 border-amber-400 text-amber-400" },
};

const exitFor = (dir: Dir) =>
  dir === "right"
    ? { x: "130%", rotate: 18, opacity: 0 }
    : dir === "left"
      ? { x: "-130%", rotate: -18, opacity: 0 }
      : { y: "-120%", opacity: 0 };

type Dealt = { doc: LandingDoctor; key: number };

/**
 * A self-playing triage deck: the top card gets stamped, flies off in the
 * gesture's direction and goes to the back of the pile. Only runs while on
 * screen; under reduced motion it holds one stamped card still.
 */
export function TriageDemo({ doctors }: { doctors: LandingDoctor[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.4 });
  const [deck, setDeck] = useState<Dealt[]>(() => doctors.map((doc, key) => ({ doc, key })));
  const [step, setStep] = useState(0);
  const [stamp, setStamp] = useState<Dir | null>(null);
  // The direction the departing card flies; set in the same render that removes it.
  const [flyDir, setFlyDir] = useState<Dir>("right");

  useEffect(() => {
    if (reduce || !visible) return;
    let fly: ReturnType<typeof setTimeout>;
    const tick = () => {
      const dir = SEQUENCE[step % SEQUENCE.length];
      setStamp(dir);
      fly = setTimeout(() => {
        setStamp(null);
        setFlyDir(dir);
        setDeck(([top, ...rest]) => [...rest, { doc: top.doc, key: top.key + doctors.length }]);
        setStep((s) => s + 1);
      }, STAMP_MS);
    };
    const id = setTimeout(tick, CYCLE_MS - STAMP_MS);
    return () => {
      clearTimeout(id);
      clearTimeout(fly);
    };
  }, [reduce, visible, step, doctors.length]);

  const active = stamp ?? (reduce ? "right" : null);

  return (
    <div ref={ref} className="grid items-center gap-10 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-16">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[18rem] md:max-w-none">
        <AnimatePresence custom={flyDir} initial={false}>
          {deck.slice(0, 3).map(({ doc, key }, i) => (
            <motion.div
              key={key}
              custom={flyDir}
              variants={{ gone: (d: Dir) => exitFor(d) }}
              className="absolute inset-0 overflow-hidden rounded-xl border bg-muted shadow-lg"
              style={{ zIndex: 3 - i }}
              initial={{ scale: 0.86, y: 40, opacity: 0 }}
              animate={{ scale: 1 - i * 0.05, y: i * 16, opacity: 1, rotate: 0, x: 0 }}
              exit="gone"
              transition={{ type: "spring", stiffness: 140, damping: 22 }}
            >
              <DoctorPhoto src={doc.photo} fallback={doc.fallback} alt={i === 0 ? `${doc.name}, ${doc.title}` : ""} fill sizes="(max-width: 768px) 288px, 352px" />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/85 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-h5 font-bold">
                  {doc.name}
                  <span className="ml-2 font-mono text-body-sm font-normal text-white/80">{doc.code}</span>
                </p>
                <p className="text-body-sm text-white/80">{doc.hospital}</p>
              </div>
              {i === 0 && active ? (
                <motion.span
                  aria-hidden
                  initial={reduce ? false : { scale: 1.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className={cn(
                    "pointer-events-none absolute z-10 rounded-lg border-[3px] bg-black/10 px-3 py-1 font-mono text-lead font-bold tracking-wider backdrop-blur-[2px]",
                    STAMPS[active].className,
                  )}
                >
                  {STAMPS[active].text}
                </motion.span>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div>
        <h2 className="text-h4 font-bold">Triage, then defibrillate.</h2>
        <p className="mt-3 max-w-[48ch] text-body text-muted-foreground">
          Every card is a doctor. Three gestures decide what happens next, and the rules live in the database.
        </p>
        <ul className="mt-8 grid gap-3">
          {GESTURES.map(({ dir: d, icon: GestureIcon, label, body }) => {
            const on = active === d;
            return (
              <li
                key={d}
                className={cn(
                  "flex items-start gap-4 rounded-xl border p-4 transition-colors duration-300",
                  on ? "border-primary/40 bg-primary/5" : "border-transparent",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-300",
                    on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  <GestureIcon weight="fill" className="size-4" />
                </span>
                <div>
                  <p className="font-mono text-body-sm font-semibold uppercase tracking-wider">{label}</p>
                  <p className="mt-0.5 text-body-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
