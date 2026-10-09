import Link from "next/link";
import { ArrowRight, Heartbeat, SealCheck } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { DoctorPhoto } from "@/components/doctor-photo";
import { AsystoleCountdown } from "@/components/landing/asystole-countdown";
import { doctor, LANDING_DOCTORS, type LandingDoctor } from "@/components/landing/doctors";
import { HeroPhotoStack } from "@/components/landing/hero-photo-stack";
import { TriageDemo } from "@/components/landing/triage-demo";
import { Logo, LogoMark } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { ASYSTOLE_HOURS, CONSULT_DORMANT_DAYS, FREE_BUBBLE_CAP, SPECIALTIES, SPECIALTY_KEYS, specialtyLabel } from "@/lib/constants";
import { getAppFlags } from "@/lib/flags";

const HERO_DOCTORS = ["Aurelia", "Keenan", "Nadya", "Raditya", "Clarissa"].map(doctor);
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

export default async function Landing() {
  const flags = await getAppFlags();
  const worldwide = flags.activeCountries.length > 1;
  const indonesiaOnly = flags.activeCountries.length === 1 && flags.activeCountries[0] === "ID";
  const nadya = doctor("Nadya");
  const aris = doctor("Aris");

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
      <BlurFade duration={0.6}>
        <section className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center py-12 text-center">
          {flags.vipEnabled ? (
            <StatusPill status="neutral">Est. post-call</StatusPill>
          ) : (
            <StatusPill status="completed">{indonesiaOnly ? "Free during launch in Indonesia" : "Free during launch"}</StatusPill>
          )}

          <h1 className="mt-8 flex flex-col items-center gap-y-[0.12em] text-h3 font-extrabold sm:text-h2 lg:text-h1">
            <span className="flex flex-wrap items-center justify-center gap-x-[0.28em] gap-y-[0.12em]">
              Doctors
              <HeroPhotoStack doctors={HERO_DOCTORS} />
              <span className="text-muted-foreground">marrying</span>
            </span>
            <span className="flex flex-wrap items-center justify-center gap-x-[0.28em]">
              <span
                aria-hidden
                className="inline-grid h-[0.9em] w-[1.2em] rotate-3 place-items-center rounded-[0.22em] bg-foreground text-background shadow-xl"
              >
                <LogoMark className="size-[0.62em]" />
              </span>
              doctors.
            </span>
          </h1>

          <p className="mt-rhythm max-w-[40ch] text-lead text-muted-foreground">
            Match with a fellow STR-verified specialist who understands why your pager vibrates during dinner.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild className="transition-transform active:scale-[0.98]">
              <Link href="/signup">
                Create your passport <ArrowRight weight="bold" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="#triage">How it works</Link>
            </Button>
          </div>
        </section>
      </BlurFade>

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

      <section id="triage" className="scroll-m-20 py-20 sm:py-28">
        <BlurFade inView>
          <TriageDemo doctors={DECK_DOCTORS} />
        </BlurFade>
      </section>

      {/* Bento: exactly four rules, four cells. */}
      <section id="protocol" className="scroll-m-20 border-t py-20 sm:py-28">
        <BlurFade inView>
          <h2 className="text-h4 font-bold">The pureblood protocol</h2>
          <p className="mt-3 max-w-[48ch] text-body text-muted-foreground">
            MD x MD only. Every rule is enforced by the database, not by vibes.
          </p>
        </BlurFade>

        <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
          <BlurFade inView className="lg:row-span-2">
            <article className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
              <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-64 lg:flex-1">
                <DoctorPhoto src={nadya.photo} fallback={nadya.fallback} alt={`${nadya.name}, ${nadya.title}`} fill sizes="(max-width: 1024px) 100vw, 360px" />
              </div>
              <div className="p-6">
                <p className="max-w-[90%] rounded-2xl rounded-bl-md bg-primary px-4 py-2.5 text-body-sm text-primary-foreground">
                  {nadya.opener}
                </p>
                <p className="mt-2 text-caption text-muted-foreground">
                  {nadya.name}, <span className="font-mono">{nadya.code}</span>
                </p>
                <h3 className="mt-6 text-h5 font-bold">She makes the first incision.</h3>
                <p className="mt-2 text-body text-muted-foreground">
                  In every female x male match, she texts first. He can only reply once she has.
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
                <DoctorPhoto src={aris.photo} fallback={aris.fallback} alt="" size={40} className="size-10 rounded-full object-cover" />
                <p className="text-body-sm font-semibold">
                  {aris.name}
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

      <BlurFade inView>
        <section className="border-t py-20 sm:py-28">
          <p className="max-w-[30ch] text-h5 font-bold sm:text-h4">
            “Because your in-laws will never complain about late-night emergency laparotomies when they are also
            general surgeons.”
          </p>
          <p className="mt-4 text-body text-muted-foreground">
            Guaranteed 100% illegible handwriting inheritance for the next generation.
          </p>
        </section>
      </BlurFade>

      <section className="border-t py-20 sm:py-28">
        <BlurFade inView>
          <h2 className="text-h4 font-bold">Pick your specialty chemistry</h2>
          <p className="mt-3 max-w-[48ch] text-body text-muted-foreground">
            Sixteen specialties, from interventional cardiology to koas. Each one comes with its own pickup line.
          </p>
        </BlurFade>
        <div role="list" className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {SPECIALTY_KEYS.map((k, i) => (
            <BlurFade key={k} inView delay={(i % 4) * 0.05}>
              <div role="listitem" className="h-full rounded-xl border bg-card p-4 sm:p-5 transition-colors duration-200 hover:border-primary/40">
                <p className="font-mono text-lead font-semibold">{SPECIALTIES[k].code}</p>
                <p className="text-caption text-muted-foreground">{specialtyLabel(k)}</p>
                <p className="mt-4 text-body-sm">{SPECIALTIES[k].joke}</p>
              </div>
            </BlurFade>
          ))}
        </div>
      </section>

      <BlurFade inView>
        <section className="flex flex-col items-center border-t py-20 text-center sm:py-28">
          <LogoMark className="size-16 animate-heartbeat" />
          <h2 className="mt-6 text-h4 font-bold sm:text-h3">Scrub in. Your match is on call.</h2>
          <p className="mt-3 max-w-[44ch] text-body text-muted-foreground">
            {flags.vipEnabled ? "Doctors, residents, GPs and koas welcome." : "Free during launch. Doctors, residents, GPs and koas welcome."}
          </p>
          <Button size="lg" asChild className="mt-8 transition-transform active:scale-[0.98]">
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
