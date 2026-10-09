import type { Icon } from "@phosphor-icons/react";
import { Cards, ChatsCircle, Confetti, IdentificationBadge } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";

const ROTATIONS: { icon: Icon; name: string; body: string }[] = [
  { icon: IdentificationBadge, name: "Scrub in", body: "Make your Doctor Passport: photos, specialty, hospital. Your STR stays private, always." },
  { icon: Cards, name: "Triage", body: "Swipe through doctors near you. Prescribe, discharge, or defibrillate the one who made your heart skip." },
  { icon: ChatsCircle, name: "Consult", body: "Match, then talk. She writes first. Flirting in SOAP format is encouraged, not required." },
  { icon: Confetti, name: "Discharge home together", body: "Our work is done here. Both mothers take it from this point." },
];

/** How it works as four rotations, connected by a line on desktop. */
export function Rotations() {
  return (
    <div role="list" className="relative grid gap-8 md:grid-cols-4 md:gap-6">
      <span aria-hidden className="absolute left-5 top-5 hidden h-px w-[calc(100%-2.5rem)] bg-border md:block" />
      {ROTATIONS.map(({ icon: RotationIcon, name, body }, i) => (
        <BlurFade key={name} inView delay={i * 0.05}>
          <div role="listitem" className="relative flex gap-4 md:block">
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full border bg-background text-primary shadow-xs">
              <RotationIcon weight="bold" className="size-5" />
            </span>
            <div className="md:mt-5">
              <h3 className="text-lead font-semibold">{name}</h3>
              <p className="mt-1.5 text-body-sm text-muted-foreground">{body}</p>
            </div>
          </div>
        </BlurFade>
      ))}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
