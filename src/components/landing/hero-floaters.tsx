import { DoctorPhoto } from "@/components/doctor-photo";
import { cn } from "@/lib/utils";
import type { LandingDoctor } from "./doctors";

/**
 * Deck doctors drifting in the empty hero margins on wide screens. Purely
 * decorative: hidden below xl, aria-hidden, no pointer events. The float
 * animation collapses under reduced motion (globals.css).
 */
export function HeroFloaters({ doctors }: { doctors: [LandingDoctor, LandingDoctor, LandingDoctor] }) {
  const photo = (d: LandingDoctor, className: string, delay: string) => (
    <div className={cn("absolute animate-float", className)} style={{ animationDelay: delay }}>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border bg-muted shadow-xl">
        <DoctorPhoto src={d.photo} fallback={d.fallback} alt="" fill sizes="144px" />
      </div>
      <p className="mt-2 truncate text-center text-caption font-medium text-muted-foreground">
        {d.name.replace("Dr. ", "dr. ")}, <span className="font-mono">{d.code}</span>
      </p>
    </div>
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
      {photo(doctors[0], "-left-16 top-[10%] w-36 -rotate-6", "0s")}
      {photo(doctors[1], "-right-16 top-[16%] w-32 rotate-6", "-2.5s")}
      {photo(doctors[2], "-right-6 bottom-[8%] w-28 -rotate-3", "-4s")}
      <div className="absolute -left-10 bottom-[14%] w-56 rotate-3 animate-float" style={{ animationDelay: "-1.5s" }}>
        <p className="rounded-2xl rounded-bl-md bg-primary px-4 py-3 text-left text-body-sm text-primary-foreground shadow-xl">
          Can you auscultate my heart? It&apos;s tachycardic because of you 💓
        </p>
        <p className="mt-2 text-caption text-muted-foreground">Seen 02:47, post-call</p>
      </div>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
