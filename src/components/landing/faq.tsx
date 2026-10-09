import { Plus } from "@phosphor-icons/react/dist/ssr";
import type { AppFlags } from "@/lib/flags";

/** Native <details> accordion: keyboard and screen reader support for free, no JS. */
export function Faq({ flags }: { flags: AppFlags }) {
  const indonesiaOnly = flags.activeCountries.length === 1 && flags.activeCountries[0] === "ID";
  const items = [
    {
      q: "Is this a real app or a joke?",
      a: flags.vipEnabled
        ? "Both. The jokes are the brand, the app is fully working: real accounts, realtime chat, verification and safety tools. VIP payments are a demo, no real money is charged."
        : "Both. The jokes are the brand, the app is fully working: real accounts, realtime chat, verification and safety tools. And it's free during launch.",
    },
    { q: "Who can join?", a: "Doctors, specialists, residents, GPs and medical students (koas). You must be 21 or older." },
    { q: "Can non-doctors join?", a: "No. Not even if you have watched every season of Grey's Anatomy. Twice. With notes." },
    {
      q: "Why does she have to text first?",
      a: "In a female x male match, she makes the first incision. The database enforces it, so no amount of charm skips the line. Nobody writes within 24 hours? The match flatlines.",
    },
    {
      q: "I'm not looking for romance. Can I still join?",
      a: "Yes. Pick Connect at sign-up to meet colleagues and future referral buddies. The she-writes-first rule is off there, and you can switch any time in your Passport.",
    },
    {
      q: "Is my STR and personal info safe?",
      a: "Your STR, alma mater and class year are never shown to other doctors. Your exact location is never shared, only a rounded distance. Phone numbers and chat links in messages are masked.",
    },
    {
      q: "How much does it cost?",
      a: flags.vipEnabled
        ? "Free comes with 10 bubbles per consult. VIP starts at Rp 50.000 a month for unlimited chat. Cancel anytime."
        : `Nothing during launch. ${flags.dailySwipeLimit} swipes and one Super Like a day, unlimited chat, no paywall.`,
    },
    {
      q: "Where is it available?",
      a: indonesiaOnly ? "Indonesia for now. More countries once we finish our rounds here." : `In ${flags.activeCountries.length} countries, with more on the way.`,
    },
  ];

  return (
    <div className="divide-y rounded-xl border bg-card">
      {items.map(({ q, a }) => (
        <details key={q} className="group px-6 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-body font-semibold outline-hidden focus-visible:text-primary">
            {q}
            <Plus weight="bold" className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45" />
          </summary>
          <p className="-mt-1 pb-5 text-body-sm text-muted-foreground">{a}</p>
        </details>
      ))}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
