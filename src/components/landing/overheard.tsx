import BlurFade from "@/components/effects/blur-fade";
import { cn } from "@/lib/utils";

// Parody lines, labeled as such on the page. Roles only, no names.
const QUOTES = [
  { text: "Because your in-laws will never complain about late-night emergency laparotomies when they are also general surgeons.", who: "General surgeon, whose in-laws are also general surgeons", big: true },
  { text: "Finally, a date who doesn't faint when I describe my day.", who: "Surgery resident, third night shift in a row" },
  { text: "He prescribed me one dinner. I complied. Excellent adherence.", who: "Psychiatrist, now in a stable relationship" },
  { text: "Our first fight was whether 3 AM counts as night or morning.", who: "Two ER doctors, still arguing" },
  { text: "My mother cried happy tears. Finally, a doctor.", who: "Koas, sixth semester" },
  { text: "We read each other's handwriting. That's how I knew.", who: "GP, engaged to another GP" },
];

/** A masonry wall of overheard lines. CSS columns keep it light, no JS. */
export function Overheard() {
  return (
    <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
      {QUOTES.map((q, i) => (
        <BlurFade key={q.who} inView delay={(i % 3) * 0.05} className="mb-5 break-inside-avoid">
          <figure className={cn("rounded-xl border p-6", q.big ? "bg-foreground text-background" : "bg-card")}>
            <blockquote className={cn("font-semibold", q.big ? "text-h5" : "text-lead")}>“{q.text}”</blockquote>
            <figcaption className={cn("mt-4 text-caption", q.big ? "text-background/70" : "text-muted-foreground")}>{q.who}</figcaption>
          </figure>
        </BlurFade>
      ))}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
