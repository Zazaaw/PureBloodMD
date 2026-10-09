import Link from "next/link";
import { getAppFlags, type AppFlags } from "@/lib/flags";
import Image from "next/image";
import { ChatCircleDots, Cards, Crown } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/logo";
import BlurFade from "@/components/effects/blur-fade";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { SPECIALTIES, SPECIALTY_KEYS } from "@/lib/constants";

const HERO_PHOTOS = [
  { src: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80", alt: "Dr. Aurelia Chen, dermatologist" },
  { src: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80", alt: "Dr. Keenan Raditya, cardiologist" },
  { src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80", alt: "Dr. Nadya Kartika, psychiatrist" },
];

function rules(flags: AppFlags) {
  const worldwide = flags.activeCountries.length > 1;
  return [
    {
      icon: Cards,
      title: "Triage, then defibrillate",
      body: worldwide
        ? "Swipe through 1,500+ doctors in 34 countries and 16 specialties, from cardiologists to koas. Right swipe delivers a 200-joule shock of interest."
        : "Swipe through 480+ doctors across Indonesia in 16 specialties, from cardiologists to koas. Right swipe delivers a 200-joule shock of interest.",
    },
    {
      icon: ChatCircleDots,
      title: "Female doctors make the first incision",
      body: "In every female x male match, she texts first. Nobody writes within 24 hours? The consult flatlines, and you get a second chance in triage.",
    },
    flags.vipEnabled
      ? {
          icon: Crown,
          title: "10 free bubbles per consult",
          body: "After that, the prescription quota is depleted. VIP plans start at Rp 50.000 or US$20 a month. Cancel anytime.",
        }
      : {
          icon: Crown,
          title: "Free during launch",
          body: `${flags.dailySwipeLimit} swipes and 1 Super Like a day, unlimited chat. No subscription, no paywall, just rounds.`,
        },
  ];
}

export default async function Landing() {
  const RULES = rules(await getAppFlags());
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="PureBloodMD home" className="text-lead">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <ModeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <BlurFade>
        <section className="grid min-h-[calc(100dvh-4rem)] items-center gap-10 py-10 lg:grid-cols-[1.1fr_1fr] lg:py-0">
          <div>
            <h1 className="max-w-[16ch] text-h3 font-extrabold sm:text-h2 lg:text-h1">
              Doctors marrying doctors. Est. post-call.
            </h1>
            <p className="mt-rhythm max-w-[52ch] text-lead text-muted-foreground">
              Match with a fellow STR-verified specialist who understands why your pager vibrates during dinner.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">Create your passport</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-4 lg:max-w-none">
            {HERO_PHOTOS.map((p, i) => (
              <div
                key={p.src}
                className={
                  i === 0
                    ? "relative row-span-2 aspect-[3/5] overflow-hidden rounded-xl border"
                    : "relative aspect-square overflow-hidden rounded-xl border"
                }
              >
                <Image src={p.src} alt={p.alt} fill priority={i === 0} sizes="(max-width: 1024px) 50vw, 300px" className="object-cover" />
              </div>
            ))}
          </div>
        </section>
      </BlurFade>

      <BlurFade inView>
        <section className="border-t py-16">
          <blockquote className="max-w-[40ch] text-h5 font-semibold">
            “Because your in-laws will never complain about late-night emergency laparotomies when they are also general surgeons.”
          </blockquote>
          <p className="mt-4 text-body text-muted-foreground">
            Guaranteed 100% illegible handwriting inheritance for the next generation.
          </p>
        </section>
      </BlurFade>

      <section className="grid gap-10 border-t py-16 lg:grid-cols-[1fr_1.4fr]">
        <BlurFade inView>
          <h2 className="text-h4 font-bold">The pureblood protocol</h2>
          <p className="mt-3 max-w-[45ch] text-body text-muted-foreground">
            MD x MD only. Three rules, enforced by the database, not by vibes.
          </p>
        </BlurFade>
        <ol className="divide-y">
          {RULES.map(({ icon: Icon, title, body }, i) => (
            <BlurFade key={title} inView delay={i * 0.05}>
              <li className="flex gap-4 py-5 first:pt-0">
                <Icon className="mt-1 size-6 shrink-0 text-primary" />
                <div>
                  <h3 className="text-lead font-semibold">{title}</h3>
                  <p className="mt-1 text-body text-muted-foreground">{body}</p>
                </div>
              </li>
            </BlurFade>
          ))}
        </ol>
      </section>

      <BlurFade inView>
        <section className="border-t py-16">
          <h2 className="text-h4 font-bold">Pick your specialty chemistry</h2>
          <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {SPECIALTY_KEYS.map((k) => (
              <li key={k} className="flex items-baseline justify-between gap-4 border-b pb-3">
                <span className="font-semibold">{SPECIALTIES[k].code}</span>
                <span className="text-right text-body-sm text-muted-foreground">{SPECIALTIES[k].joke}</span>
              </li>
            ))}
          </ul>
        </section>
      </BlurFade>

      <footer className="flex flex-col gap-2 border-t py-8 text-caption text-muted-foreground sm:flex-row sm:justify-between">
        <span>PureBloodMD. A parody, not medical advice.</span>
        <span className="flex gap-4">
          <Link href="/terms" className="-my-2 py-2 hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="-my-2 py-2 hover:text-foreground">Privacy</Link>
          <span>Blue badge = ID and license checked.</span>
        </span>
      </footer>
    </div>
  );
}
