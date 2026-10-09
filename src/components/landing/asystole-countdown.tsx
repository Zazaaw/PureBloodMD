"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ASYSTOLE_HOURS } from "@/lib/constants";

const START = ASYSTOLE_HOURS * 3600 - 19; // starts mid-countdown so it visibly runs

const pad = (n: number) => String(n).padStart(2, "0");
const format = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

/** The same countdown a fresh match shows in the consult list, ticking for real. */
export function AsystoleCountdown() {
  const reduce = useReducedMotion();
  const [left, setLeft] = useState(START);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : START)), 1000);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <p className="font-mono text-h3 font-semibold tabular-nums sm:text-h2" role="timer" aria-label={`${ASYSTOLE_HOURS} hour countdown`}>
      {format(left)}
    </p>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
