import { HeartStraight } from "@phosphor-icons/react/dist/ssr";
import { DoctorPhoto } from "@/components/doctor-photo";
import { cn } from "@/lib/utils";
import type { LandingDoctor } from "./doctors";

function Avatar({ d, className }: { d: LandingDoctor; className?: string }) {
  return (
    <DoctorPhoto src={d.photo} fallback={d.fallback} alt="" size={32} className={cn("size-8 shrink-0 rounded-full object-cover", className)} />
  );
}

function Floater({ className, delay, children }: { className: string; delay: string; children: React.ReactNode }) {
  return (
    <div className={cn("absolute animate-float", className)} style={{ animationDelay: delay }}>
      {children}
    </div>
  );
}

/**
 * A consult happening in the empty hero margins on wide screens: the match,
 * her opening line (she writes first), him typing, a reply. Purely decorative:
 * hidden below xl, aria-hidden, no pointer events. The float animation collapses under
 * reduced motion (globals.css).
 */
export function HeroFloaters({ doctors }: { doctors: [LandingDoctor, LandingDoctor] }) {
  const [michelle, aris] = doctors;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
      <Floater className="-left-16 top-[12%] w-60 -rotate-3" delay="0s">
        <div className="flex items-end gap-2">
          <Avatar d={michelle} />
          <p className="rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-left text-body-sm shadow-xl">
            Are you a CT scan? Because I can see right through you.
          </p>
        </div>
        <p className="mt-2 pl-10 text-caption text-muted-foreground">
          {michelle.name.replace("Dr. ", "dr. ")}, <span className="font-mono">{michelle.code}</span>
        </p>
      </Floater>

      <Floater className="-right-14 top-[16%] w-60 rotate-3" delay="-2.5s">
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xl">
          <div className="flex shrink-0 -space-x-3">
            <Avatar d={michelle} className="size-10 ring-2 ring-card" />
            <Avatar d={aris} className="size-10 ring-2 ring-card" />
          </div>
          <div className="min-w-0 text-left">
            <p className="flex items-center gap-1 text-body-sm font-semibold">
              It&apos;s a match <HeartStraight weight="fill" className="size-3.5 text-primary" />
            </p>
            <p className="text-caption text-muted-foreground">
              She wrote first. Consult is open.
            </p>
          </div>
        </div>
      </Floater>

      <Floater className="-right-4 bottom-[12%] -rotate-2" delay="-4s">
        <div className="flex items-end gap-2">
          <Avatar d={aris} />
          <div className="flex gap-1 rounded-2xl rounded-bl-md border bg-card px-4 py-3.5 shadow-xl">
            {[0, 0.15, 0.3].map((d) => (
              <span key={d} className="size-1.5 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: `${d}s` }} />
            ))}
          </div>
        </div>
        <p className="mt-2 pl-10 text-caption text-muted-foreground">Typing between patients</p>
      </Floater>

      <Floater className="-left-10 bottom-[14%] w-56 rotate-3" delay="-1.5s">
        <p className="rounded-2xl rounded-br-md bg-primary px-4 py-3 text-left text-body-sm text-primary-foreground shadow-xl">
          Can you auscultate my heart? It&apos;s tachycardic because of you 💓
        </p>
        <p className="mt-2 text-right text-caption text-muted-foreground">Seen 02:47, post-call</p>
      </Floater>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
