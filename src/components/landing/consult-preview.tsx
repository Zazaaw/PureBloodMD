"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ShieldCheck } from "@phosphor-icons/react";
import { DoctorPhoto } from "@/components/doctor-photo";
import { cn } from "@/lib/utils";
import type { LandingDoctor } from "./doctors";

type Line =
  | { kind: "msg"; from: "her" | "him"; text: React.ReactNode }
  | { kind: "note"; text: string };

const TYPING_MS = 1100;
const GAP_MS = 500;

/**
 * A scripted consult that plays once when scrolled into view: she opens
 * (Bumble rule), they flirt, and a phone number gets masked like the real
 * chat does. Under reduced motion the whole thread shows at once.
 */
export function ConsultPreview({ her, him }: { her: LandingDoctor; him: LandingDoctor }) {
  const lines: Line[] = [
    { kind: "note", text: `${her.name.split(" ").slice(0, 2).join(" ")} makes the first incision.` },
    { kind: "msg", from: "her", text: her.opener },
    { kind: "msg", from: "him", text: "Post-call and barely alive, but alive enough for coffee. Senopati, Saturday?" },
    { kind: "msg", from: "her", text: <>Deal. Text me: <span className="font-mono">0812 **** ****</span></> },
    { kind: "note", text: "Numbers and chat links are masked automatically. Swap contacts when you both feel ready." },
    { kind: "msg", from: "him", text: "Respect. I will bring my most legible handwriting ✍️" },
  ];

  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [shown, setShown] = useState(0);
  const total = lines.length;
  const visible = reduce ? total : shown;
  const next = lines[shown];
  // The next message's sender is "typing" until it lands.
  const typing = !reduce && inView && next?.kind === "msg" ? next.from : null;
  const nextKind = next?.kind;

  useEffect(() => {
    if (reduce || !inView || !nextKind) return;
    const id = setTimeout(() => setShown((n) => n + 1), nextKind === "note" ? GAP_MS : TYPING_MS);
    return () => clearTimeout(id);
  }, [reduce, inView, shown, nextKind]);

  return (
    <div ref={ref} className="mx-auto w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-lg">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <DoctorPhoto src={her.photo} fallback={her.fallback} alt="" size={40} className="size-10 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold">{her.name}</p>
          <p className="truncate text-caption text-muted-foreground">
            <span className="font-mono">{her.code}</span> {her.title}
          </p>
        </div>
      </div>

      <div className="flex min-h-[26rem] flex-col justify-end gap-2 px-4 py-5">
        <AnimatePresence initial={false}>
          {lines.slice(0, visible).map((line, i) =>
            line.kind === "note" ? (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mx-auto my-1 flex max-w-[90%] items-start gap-1.5 text-center text-caption text-muted-foreground",
                  i > 0 && "rounded-lg bg-muted px-3 py-2 text-left",
                )}
              >
                {i > 0 ? <ShieldCheck weight="fill" className="mt-0.5 size-3.5 shrink-0 text-primary" /> : null}
                {line.text}
              </motion.p>
            ) : (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-body-sm",
                  line.from === "her"
                    ? "origin-bottom-left self-start rounded-bl-md bg-muted"
                    : "origin-bottom-right self-end rounded-br-md bg-primary text-primary-foreground",
                )}
              >
                {line.text}
              </motion.p>
            ),
          )}
          {typing ? (
            <motion.span
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden
              className={cn(
                "flex gap-1 rounded-2xl px-4 py-3",
                typing === "her" ? "self-start rounded-bl-md bg-muted" : "self-end rounded-br-md bg-primary/80",
              )}
            >
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className={cn("size-1.5 animate-bounce rounded-full", typing === "her" ? "bg-muted-foreground" : "bg-primary-foreground")}
                  style={{ animationDelay: `${d * 0.15}s` }}
                />
              ))}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <p className="sr-only">
        A sample consult between {her.name} and {him.name}.
      </p>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
