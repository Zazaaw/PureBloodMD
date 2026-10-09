import Link from "next/link";
import { ArrowRight, HandsClapping, Heartbeat, HeartStraight, SealCheck } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { DoctorPhoto } from "@/components/doctor-photo";
import { AsystoleCountdown } from "@/components/landing/asystole-countdown";
import { CivilianVsColleague } from "@/components/landing/civilian-vs-colleague";
import { ConsultPreview } from "@/components/landing/consult-preview";
import { doctor, LANDING_DOCTORS, type LandingDoctor } from "@/components/landing/doctors";
import { Faq } from "@/components/landing/faq";
import { HeroFloaters } from "@/components/landing/hero-floaters";
import { HeroPhotoStack } from "@/components/landing/hero-photo-stack";
import { Overheard } from "@/components/landing/overheard";
import { PackageInsert } from "@/components/landing/package-insert";
import { Rotations } from "@/components/landing/rotations";
import { SymptomChecker } from "@/components/landing/symptom-checker";
import { TriageDemo } from "@/components/landing/triage-demo";
import { Logo, LogoMark } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { ASYSTOLE_HOURS, CONSULT_DORMANT_DAYS, FREE_BUBBLE_CAP, SPECIALTIES, SPECIALTY_KEYS, specialtyLabel } from "@/lib/constants";
import { getAppFlags } from "@/lib/flags";
import { cn } from "@/lib/utils";

const HERO_DOCTORS = ["Aurelia", "Keenan", "Nadya", "Raditya", "Clarissa"].map(doctor);
const FLOATERS = ["Michelle", "Aris", "Alana"].map(doctor) as [LandingDoctor, LandingDoctor, LandingDoctor];
const DECK_DOCTORS = ["Stella", "Brandon", "Jessica", "Dimas", "Vania"].map(doctor);

function MarqueeRow({ doctors, hidden }: { doctors: LandingDoctor[]; hidden?: boolean }) {
  return (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 animate-marquee gap-(--gap) group-hover:[animation-play-state:paused]"
    >
      {doctors.map((d) => (
        <li key={d.name} className="flex w-52 items-center gap-3">
          <DoctorPhoto src={d.photo} fallback={d.fallback} alt={hidden ? "" : d.name} size={44} className="size-11 shrink-0 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold">{d.name}</p>
            <p className="truncate text-caption text-muted-foreground">
              <span className="font-mono">{d.code}</span> {d.title}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Section title + one supporting line, stacked (skill-ui-ux: no split headers). */
function SectionHeading({ title, children, center }: { title: string; children?: React.ReactNode; center?: boolean }) {
  return (
    <BlurFade inView className={cn("mb-10", center && "mx-auto text-center")}>
      <h2 className="text-h4 font-bold sm:text-h3">{title}</h2>
      {children ? (
        <p className={cn("mt-3 max-w-[52ch] text-body text-muted-foreground sm:text-lead", center && "mx-auto")}>{children}</p>
      ) : null}
    </BlurFade>
  );
}

export default async function Landing() {
  const flags = await getAppFlags();
  const worldwide = flags.activeCountries.length > 1;
  const indonesiaOnly = flags.activeCountries.length === 1 && flags.activeCountries[0] === "ID";
  const nadya = doctor("Nadya");
  const kevin = doctor("Kevin");

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

      {/* Hero: the headline is the visual, with real deck doctors cycling inside it. */}
      <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center py-12 text-center">
        <HeroFloaters doctors={FLOATERS} />
        <BlurFade duration={0.6} className="relative flex flex-col items-center">
          {flags.vipEnabled ? (
            <StatusPill status="neutral">Est. post-call</StatusPill>
          ) : (
            <StatusPill status="completed">{indonesiaOnly ? "Free during launch in Indonesia" : "Free during launch"}</StatusPill>
          )}

          <h1 className="mt-8 flex flex-col items-center gap-y-[0.1em] text-h3 font-extrabold sm:text-h2 md:text-h1 lg:text-display">
            <span className="flex flex-wrap items-center justify-center gap-x-[0.26em] gap-y-[0.1em]">
              Doctors
              <HeroPhotoStack doctors={HERO_DOCTORS} />
              <span className="text-muted-foreground">marrying</span>
            </span>
            <span className="flex flex-wrap items-center justify-center gap-x-[0.26em]">
              <span
                aria-hidden
                className="inline-grid h-[0.9em] w-[1.2em] rotate-3 place-items-center rounded-[0.22em] bg-foreground text-background shadow-xl"
              >
                <LogoMark className="size-[0.62em]" />
              </span>
              doctors.
            </span>
          </h1>

          <p className="mt-rhythm max-w-[38ch] text-lead text-muted-foreground sm:text-h5 sm:font-normal sm:leading-snug">
            Match with a fellow STR-verified specialist who understands why your pager vibrates during dinner.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild className="h-12 px-7 text-body transition-transform active:scale-[0.98]">
              <Link href="/signup">
                Create your passport <ArrowRight weight="bold" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="h-12 px-6 text-body">
              <Link href="#triage">How it works</Link>
            </Button>
          </div>
        </BlurFade>
      </section>

      {/* The one marquee on the page: who is actually in the deck. */}
      <BlurFade inView>
        <section aria-label="Doctors in the deck" className="border-y py-8">
          <p className="text-center text-body-sm text-muted-foreground">
            {worldwide ? "1,500+ doctors in 34 countries" : "480+ doctors across Indonesia"} are on rounds in triage.
          </p>
          <div
            className="group mt-6 flex overflow-hidden gap-(--gap) [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
            style={{ "--gap": "1.5rem", "--duration": "60s" } as React.CSSProperties}
          >
            <MarqueeRow doctors={LANDING_DOCTORS} />
            <MarqueeRow doctors={LANDING_DOCTORS} hidden />
          </div>
        </section>
      </BlurFade>

      <section className="py-20 sm:py-28">
        <SectionHeading title="First, a quick anamnesis." center>
          Six questions. Be honest, nothing leaves your browser.
        </SectionHeading>
        <BlurFade inView>
          <SymptomChecker />
        </BlurFade>
      </section>

      <section className="border-t py-20 sm:py-28">
        <SectionHeading title="Dating a civilian vs dating a colleague.">
          Same five moments. Very different outcomes.
        </SectionHeading>
        <BlurFade inView>
          <CivilianVsColleague />
        </BlurFade>
      </section>

      <section id="triage" className="scroll-m-20 border-t py-20 sm:py-28">
        <BlurFade inView>
          <TriageDemo doctors={DECK_DOCTORS} />
        </BlurFade>
      </section>

      <section className="border-t py-20 sm:py-28">
        <SectionHeading title="Four rotations to forever.">No residency required. Well, technically it is.</SectionHeading>
        <Rotations />
      </section>

      {/* Bento: exactly four rules, four cells. */}
      <section id="protocol" className="scroll-m-20 border-t py-20 sm:py-28">
        <SectionHeading title="The pureblood protocol">MD x MD only. Every rule is enforced by the database, not by vibes.</SectionHeading>

        <div className="grid gap-5 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
          <BlurFade inView className="lg:row-span-2">
            <article className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
              <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-64 lg:flex-1">
                <DoctorPhoto src={nadya.photo} fallback={nadya.fallback} alt={`${nadya.name}, ${nadya.title}`} fill sizes="(max-width: 1024px) 100vw, 360px" />
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-2">
                  <p className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-body-sm font-semibold">
                    <HeartStraight weight="fill" className="size-4 text-primary" /> Romance
                  </p>
                  <p className="flex items-center gap-2 rounded-lg border px-3 py-2 text-body-sm font-semibold">
                    <HandsClapping weight="fill" className="size-4 text-muted-foreground" /> Connect
                  </p>
                </div>
                <h3 className="mt-6 text-h5 font-bold">Love, or just referrals.</h3>
                <p className="mt-2 text-body text-muted-foreground">
                  Date a doctor, or collect colleagues and referral buddies. Pick at sign-up, switch in your Passport anytime.
                </p>
              </div>
            </article>
          </BlurFade>

          <BlurFade inView delay={0.05} className="lg:col-span-2">
            <article className="flex h-full flex-col justify-between gap-8 rounded-xl border bg-muted/60 p-6 sm:flex-row sm:items-end">
              <div>
                <Heartbeat weight="bold" className="size-8 animate-heartbeat text-primary" />
                <h3 className="mt-6 text-h5 font-bold">Say hi within {ASYSTOLE_HOURS} hours.</h3>
                <p className="mt-2 max-w-[42ch] text-body text-muted-foreground">
                  Nobody writes? The consult flatlines and you both get a second chance in triage. After the first
                  message, only {CONSULT_DORMANT_DAYS} days of silence ends it.
                </p>
              </div>
              <AsystoleCountdown />
            </article>
          </BlurFade>

          <BlurFade inView delay={0.1}>
            <article className="flex h-full flex-col rounded-xl bg-primary p-6 text-primary-foreground shadow-sm">
              <p className="text-h1 font-extrabold tabular-nums">{flags.vipEnabled ? FREE_BUBBLE_CAP : flags.dailySwipeLimit}</p>
              <h3 className="text-lead font-semibold">{flags.vipEnabled ? "free bubbles per consult" : "swipes a day, on the house"}</h3>
              <p className="mt-auto pt-6 text-body-sm text-primary-foreground/80">
                {flags.vipEnabled
                  ? "Then the prescription quota is depleted. VIP starts at Rp 50.000 a month."
                  : "Plus 1 Super Like a day and unlimited chat. No subscription, no paywall."}
              </p>
            </article>
          </BlurFade>

          <BlurFade inView delay={0.15}>
            <article className="flex h-full flex-col rounded-xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <DoctorPhoto src={kevin.photo} fallback={kevin.fallback} alt="" size={40} className="size-10 rounded-full object-cover" />
                <p className="text-body-sm font-semibold">
                  {kevin.name}
                  <SealCheck weight="fill" className="ml-1 inline size-4 align-[-0.15em] text-sky-500" aria-label="Verified" />
                </p>
              </div>
              <h3 className="mt-6 text-lead font-semibold">Blue badge, checked by a human.</h3>
              <p className="mt-2 text-body-sm text-muted-foreground">
                A person reviews the ID and the STR (or student card). Documents sit in a private bucket no member can read.
              </p>
            </article>
          </BlurFade>
        </div>
      </section>

      <section className="border-t py-20 sm:py-28">
        <div className="grid items-center gap-12 md:grid-cols-[1fr_minmax(0,28rem)] md:gap-16">
          <BlurFade inView>
            <h2 className="text-h4 font-bold sm:text-h3">Consults, with a chaperone built in.</h2>
            <p className="mt-3 max-w-[44ch] text-body text-muted-foreground sm:text-lead">
              She makes the first incision. Phone numbers stay masked until you both feel ready. Photos and medical stickers
              for when words fail post-call.
            </p>
            <p className="mt-6 text-body-sm text-muted-foreground">
              Something off? Report or block from the chat in two taps, with screenshots as evidence.
            </p>
          </BlurFade>
          <BlurFade inView delay={0.05}>
            <ConsultPreview her={doctor("Clarissa")} him={doctor("Raditya")} />
          </BlurFade>
        </div>
      </section>

      <section className="border-t py-20 sm:py-28">
        <SectionHeading title="Overheard in the doctors' lounge.">Parody quotes. Names withheld to protect the post-call.</SectionHeading>
        <Overheard />
      </section>

      <section className="border-t py-20 sm:py-28">
        <SectionHeading title="Pick your specialty chemistry">
          Sixteen specialties, from interventional cardiology to koas. Each one comes with its own pickup line.
        </SectionHeading>
        <div role="list" className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {SPECIALTY_KEYS.map((k, i) => (
            <BlurFade key={k} inView delay={(i % 4) * 0.05}>
              <div role="listitem" className="h-full rounded-xl border bg-card p-4 transition-colors duration-200 hover:border-primary/40 sm:p-5">
                <p className="font-mono text-lead font-semibold">{SPECIALTIES[k].code}</p>
                <p className="text-caption text-muted-foreground">{specialtyLabel(k)}</p>
                <p className="mt-4 text-body-sm">{SPECIALTIES[k].joke}</p>
              </div>
            </BlurFade>
          ))}
        </div>
      </section>

      <section className="border-t py-20 sm:py-28">
        <SectionHeading title="Read the leaflet before use.">Like every good prescription, it comes with fine print.</SectionHeading>
        <BlurFade inView>
          <PackageInsert dailySwipes={flags.dailySwipeLimit} vipEnabled={flags.vipEnabled} />
        </BlurFade>
      </section>

      <section className="border-t py-20 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <BlurFade inView className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-h4 font-bold sm:text-h3">Frequently asked, freshly triaged.</h2>
            <p className="mt-3 text-body text-muted-foreground">
              Still unsure? Read the{" "}
              <Link href="/terms" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">terms</Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">privacy policy</Link>.
            </p>
          </BlurFade>
          <BlurFade inView delay={0.05}>
            <Faq flags={flags} />
          </BlurFade>
        </div>
      </section>

      <BlurFade inView>
        <section className="flex flex-col items-center border-t py-24 text-center sm:py-32">
          <LogoMark className="size-20 animate-heartbeat" />
          <h2 className="mt-8 text-h3 font-extrabold sm:text-h2 lg:text-h1">Scrub in. Your match is on call.</h2>
          <p className="mt-4 max-w-[44ch] text-body text-muted-foreground sm:text-lead">
            {flags.vipEnabled ? "Doctors, residents, GPs and koas welcome." : "Free during launch. Doctors, residents, GPs and koas welcome."}
          </p>
          <Button size="lg" asChild className="mt-10 h-12 px-7 text-body transition-transform active:scale-[0.98]">
            <Link href="/signup">
              Create your passport <ArrowRight weight="bold" />
            </Link>
          </Button>
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

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
