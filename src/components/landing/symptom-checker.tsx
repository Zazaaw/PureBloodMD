"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Stethoscope } from "@phosphor-icons/react";
import { StatusPill, type PillStatus } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SYMPTOMS = [
  "Your last date ended with a code blue page",
  "You have explained \"on call\" to a civilian more than three times",
  "Your longest relationship is with your Littmann",
  "You flirt in SOAP format",
  "Your mother asks weekly when you will marry a doctor",
  "You once fell asleep mid-date, post-call",
];

type Diagnosis = { status: PillStatus; triage: string; name: string; code: string; rx: string };

function diagnose(count: number): Diagnosis {
  if (count === 0)
    return { status: "completed", triage: "Green", name: "Suspiciously healthy", code: "PB-000", rx: "Are you a dermatologist? Normal working hours suit you. Swipe anyway." };
  if (count <= 2)
    return { status: "upcoming", triage: "Yellow", name: "Mild romantic bradycardia", code: "PB-212", rx: "One swipe PRN. Repeat after every night shift." };
  if (count <= 4)
    return { status: "pending", triage: "Orange", name: "Acute post-call loneliness", code: "PB-404", rx: "Create a Doctor Passport, stat. Twenty swipes a day until symptoms resolve." };
  return { status: "cancelled", triage: "Red", name: "Chronic pureblood deficiency", code: "PB-911", rx: "Admit immediately. Your mother has already been notified." };
}

/**
 * The landing's self-assessment: tick symptoms, get a triage color and a
 * prescription. Pure client state, nothing is sent anywhere.
 */
export function SymptomChecker() {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const dx = diagnose(checked.size);

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="grid overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-[1.25fr_1fr]">
      <fieldset className="p-6 sm:p-8">
        <legend className="sr-only">Symptoms</legend>
        <p className="text-body-sm font-medium text-muted-foreground">Tick everything that applies.</p>
        <div className="mt-4 grid gap-2">
          {SYMPTOMS.map((s, i) => {
            const on = checked.has(i);
            return (
              <label
                key={s}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-body-sm transition-colors duration-200 has-focus-visible:ring-1 has-focus-visible:ring-ring",
                  on ? "border-primary/40 bg-primary/5" : "hover:bg-accent",
                )}
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(i)} />
                <span
                  aria-hidden
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-md border transition-colors duration-200",
                    on ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                  )}
                >
                  {on ? <Check weight="bold" className="size-3.5" /> : null}
                </span>
                {s}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col border-t bg-muted/50 p-6 sm:p-8 lg:border-l lg:border-t-0" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-body-sm font-semibold">
            <Stethoscope weight="bold" className="size-5 text-primary" /> Working diagnosis
          </span>
          <StatusPill status={dx.status}>Triage {dx.triage}</StatusPill>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={dx.code}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex-1"
          >
            <p className="font-mono text-caption text-muted-foreground">ICD-PB {dx.code}</p>
            <p className="mt-1 text-h5 font-bold">{dx.name}</p>
            <p className="mt-6 text-caption font-semibold text-muted-foreground">Rx</p>
            <p className="mt-1 text-body">{dx.rx}</p>
          </motion.div>
        </AnimatePresence>
        <p className="mt-8 font-mono text-caption text-muted-foreground tabular-nums">
          {checked.size} of {SYMPTOMS.length} symptoms present
        </p>
        <Button asChild className="mt-4 w-full transition-transform active:scale-[0.98]">
          <Link href="/signup">
            Create your passport <ArrowRight weight="bold" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
