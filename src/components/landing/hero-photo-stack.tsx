"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { DoctorPhoto } from "@/components/doctor-photo";
import { cn } from "@/lib/utils";
import type { LandingDoctor } from "./doctors";

const HOLD_MS = 2200;

/**
 * The inline photo slot in the hero headline: one doctor at a time slides up,
 * holds, and the next one takes the slot. The first slide is repeated at the
 * end so the loop wraps without a visible jump. Sized in `em`, so it scales
 * with the headline at every breakpoint.
 */
export function HeroPhotoStack({ doctors, className }: { doctors: LandingDoctor[]; className?: string }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const slides = [...doctors, doctors[0]];

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setAnimate(true);
      setIndex((i) => i + 1);
    }, HOLD_MS);
    return () => clearInterval(id);
  }, [reduce]);

  // Landed on the repeated first slide: snap back to the real one, no transition.
  const onTransitionEnd = () => {
    if (index < doctors.length) return;
    setAnimate(false);
    setIndex(0);
  };

  // Decorative inside the <h1>: the headline reads the same without it.
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block h-[0.9em] w-[1.35em] shrink-0 -rotate-4 overflow-hidden rounded-[0.22em] bg-muted shadow-xl ring-1 ring-border",
        className,
      )}
    >
      <span
        onTransitionEnd={onTransitionEnd}
        className={cn("flex flex-col", animate && "transition-transform duration-800 ease-[cubic-bezier(0.65,0,0.35,1)]")}
        style={{ height: `${slides.length * 100}%`, transform: `translateY(-${(index * 100) / slides.length}%)` }}
      >
        {slides.map((d, i) => (
          <span key={`${d.photo}-${i}`} className="relative block w-full" style={{ height: `${100 / slides.length}%` }}>
            <DoctorPhoto src={d.photo} fallback={d.fallback} alt="" fill sizes="120px" priority={i === 0} />
          </span>
        ))}
      </span>
    </span>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-landing-page
