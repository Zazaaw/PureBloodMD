"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowCounterClockwise,
  Broadcast,
  Flag,
  ArrowUUpLeft,
  HeartStraight,
  Prohibit,
  Lightning,
  Pill,
  SealCheck,
  SlidersHorizontal,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import BlurFade from "@/components/effects/blur-fade";
import { DoctorDetails, DoctorPhotoPanel } from "@/components/doctor-card";
import { DoctorPhoto } from "@/components/doctor-photo";
import { OnlineDot, useIsOnline } from "@/components/presence";
import { Select } from "@/components/form/field";
import { Modal } from "@/components/modal";
import { SafetyDialog } from "@/components/safety-dialog";
import { VipDialog } from "@/components/vip-dialog";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import PillTabs from "@/components/ui/pill-tabs";
import {
  GENDER_TABS,
  RADIUS_MAX,
  RADIUS_MIN,
  SPECIALTIES,
  SPECIALTY_KEYS,
  TRAITS,
  countryName,
  seekingToTab,
  specialtyLabel,
  tabToSeeking,
} from "@/lib/constants";
import { sounds } from "@/lib/sounds";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Seeking } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isVerified } from "@/lib/verified";

type Quota = { used: number; quota: number | null; next_at: string | null };
type RewindQuota = { used: number; quota: number | null };
type SwipeQuota = { used: number; quota: number | null; next_at: string | null };
type Props = {
  me: Profile;
  initialCandidates: Profile[];
  hasLocation: boolean;
  superQuota: Quota;
  rewindQuota: RewindQuota;
  swipeQuota: SwipeQuota;
  /** Launch switches from app_config. */
  vipEnabled: boolean;
  activeCountries: string[];
};
type Direction = "left" | "right" | "super";

export function DiscoverClient({ me, initialCandidates, hasLocation: serverHasLocation, superQuota, rewindQuota, swipeQuota, vipEnabled, activeCountries }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [candidates, setCandidates] = useState(initialCandidates);
  const [seeking, setSeeking] = useState<Seeking>(me.seeking);
  const [country, setCountry] = useState(me.country ?? "ID");
  const [radius, setRadius] = useState(25);
  // Without a radar fix there are no distances, so start with the whole country.
  // The server prop only learns about a new radar fix after a refresh; track it locally too.
  const [scanned, setScanned] = useState(false);
  const hasLocation = serverHasLocation || scanned;
  const [nationwide, setNationwide] = useState(!serverHasLocation);
  const [scanning, setScanning] = useState(false);
  const [safety, setSafety] = useState<{ mode: "report" | "block"; doc: Profile } | null>(null);
  const [quota, setQuota] = useState<Quota>(superQuota);
  const [vipOpen, setVipOpen] = useState(false);
  const superLeft = quota.quota == null ? Infinity : Math.max(0, quota.quota - quota.used);
  const [swipes, setSwipes] = useState<SwipeQuota>(swipeQuota);
  const swipesLeft = swipes.quota == null ? Infinity : Math.max(0, swipes.quota - swipes.used);
  const rechargeAt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "tomorrow";
  const [specialty, setSpecialty] = useState<string>("ALL");
  const [traits, setTraits] = useState<Set<string>>(new Set(["Caffeine Tolerant"]));
  const [syncPct, setSyncPct] = useState(94);
  const [showFilters, setShowFilters] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  // The last swipe the server confirmed: what Rewind would undo.
  const [lastSwiped, setLastSwiped] = useState<{ doc: Profile; dir: Direction; matched: boolean } | null>(null);
  const [rewinds, setRewinds] = useState<RewindQuota>(rewindQuota);
  const rewindLeft = rewinds.quota == null ? Infinity : Math.max(0, rewinds.quota - rewinds.used);
  // Drag-to-swipe: live offset while a finger/mouse is dragging the card.
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  // A drag commits to one axis: sideways (pass / like) or upward (Super Like). Downward does nothing.
  const dragAxis = useRef<"x" | "up" | null>(null);

  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<Direction | null>(null);
  const [radarOpen, setRadarOpen] = useState(false);
  const [match, setMatch] = useState<{ doc: Profile; matchId: string } | null>(null);
  const [resetting, startReset] = useTransition();

  // A fresh server list (after router.refresh) replaces the local one.
  const [prevInitial, setPrevInitial] = useState(initialCandidates);
  if (initialCandidates !== prevInitial) {
    setPrevInitial(initialCandidates);
    // The server list is for my own country; keep a foreign deck the user is browsing.
    if (country === (me.country ?? "ID")) {
      setCandidates(initialCandidates);
      setIndex(0);
    }
  }

  // The database returns one country at a time (RPC results are capped at 1000 rows).
  const [loadingDeck, setLoadingDeck] = useState(false);
  const changeCountry = async (cc: string) => {
    changeFilter(() => setCountry(cc));
    setLoadingDeck(true);
    const { data, error } = await supabase.rpc("get_candidates", { p_country: cc });
    setLoadingDeck(false);
    if (error) return toast.error("Could not load that country. Try again.");
    setCandidates((data ?? []) as Profile[]);
    setIndex(0);
  };

  // Radar: nearest first (people who Super Liked you stay on top). If nobody is inside the
  // radius yet (most doctors are in Jabodetabek for now), fall back to the nearest across
  // the country instead of an empty deck, and say so.
  const { filtered, radarFallback } = useMemo(() => {
    const base = candidates.filter((d) => {
      if (seeking !== "all" && d.gender !== seeking) return false;
      if ((d.country ?? "ID") !== country) return false;
      if (specialty !== "ALL" && d.specialty !== specialty) return false;
      if (verifiedOnly && !isVerified(d)) return false;
      return true;
    });
    const near = (list: Profile[]) =>
      [...list].sort(
        (a, b) =>
          Number(Boolean(b.superliked_me)) - Number(Boolean(a.superliked_me)) ||
          (a.distance_km == null ? Infinity : Number(a.distance_km)) - (b.distance_km == null ? Infinity : Number(b.distance_km))
      );
    if (nationwide) return { filtered: hasLocation ? near(base) : base, radarFallback: false };
    const inRadius = base.filter((d) => d.distance_km != null && Number(d.distance_km) <= radius);
    if (inRadius.length || !base.length) return { filtered: near(inRadius), radarFallback: false };
    return { filtered: near(base), radarFallback: true };
  }, [candidates, seeking, nationwide, specialty, country, radius, verifiedOnly, hasLocation]);

  const current = filtered.length ? filtered[index % filtered.length] : null;
  const currentOnline = useIsOnline(current?.id ?? "", current?.is_bot ?? false) && !!current;

  const reshuffleSync = () => setSyncPct(88 + Math.floor(Math.random() * 11));

  const changeFilter = (fn: () => void) => {
    fn();
    setIndex(0);
    reshuffleSync();
  };

  /** Radar = one device location read, rounded to ~1 km by the database. */
  const scanRadar = () => {
    if (!("geolocation" in navigator)) {
      toast.error("This browser has no radar (geolocation). Showing the whole country.");
      setNationwide(true);
      setRadarOpen(false);
      return;
    }
    setScanning(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error } = await supabase.rpc("set_my_location", {
          p_lat: pos.coords.latitude,
          p_lng: pos.coords.longitude,
        });
        setScanning(false);
        setRadarOpen(false);
        if (error) {
          toast.error("Radar calibration failed. Try again.");
          return;
        }
        sounds.fanfare();
        // Fetch the deck again right away so every card carries a distance; don't wait for a
        // full server refresh (on a slow connection the old, distance-less deck would show).
        setLoadingDeck(true);
        const { data, error: deckError } = await supabase.rpc("get_candidates", { p_country: country });
        setLoadingDeck(false);
        setScanned(true);
        if (!deckError) setCandidates((data ?? []) as Profile[]);
        setNationwide(false);
        setIndex(0);
        reshuffleSync();
        toast.success("Radar calibrated. Nearest doctors first.");
        router.refresh();
      },
      (err) => {
        setScanning(false);
        setRadarOpen(false);
        setNationwide(true);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Showing everyone in your country instead."
            : "Could not get a radar fix. Showing everyone in your country instead."
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  };

  const changeSeeking = async (tab: string) => {
    const next = tabToSeeking(tab) as Seeking;
    changeFilter(() => setSeeking(next));
    await supabase.from("profiles").update({ seeking: next }).eq("id", me.id);
  };

  const swipe = useCallback(
    async (dir: Direction) => {
      if (!current || leaving) return;
      const doc = current;
      if (swipesLeft === 0) {
        toast(`Shift over: all ${swipes.quota} swipes used for today. Back on rounds at ${rechargeAt(swipes.next_at)}.`);
        setDrag(null);
        return;
      }
      if (dir === "super" && superLeft === 0) {
        toast(
          me.is_vip
            ? "All 5 Super Likes used today. They recharge 24 hours after each one."
            : vipEnabled
              ? "Your free Super Like is used for today. VIP gets 5 a day."
              : `Your Super Like for today is used. It recharges at ${rechargeAt(quota.next_at)}.`
        );
        if (vipEnabled && !me.is_vip) setVipOpen(true);
        setDrag(null);
        return;
      }
      if (dir === "left") sounds.beep(320);
      else if (dir === "super") sounds.defib();
      else sounds.beep(720);
      setLeaving(dir);

      // Remove from the deck right away; the server call runs in the background.
      setTimeout(() => {
        setCandidates((list) => list.filter((d) => d.id !== doc.id));
        setLeaving(null);
        setDrag(null);
      }, 280);

      const { data, error } = await supabase.rpc("swipe_profile", { p_target: doc.id, p_direction: dir });
      if (error) {
        setCandidates((list) => (list.some((d) => d.id === doc.id) ? list : [doc, ...list]));
        if (error.message.includes("swipe_limit")) {
          setSwipes((s) => ({ ...s, used: s.quota ?? s.used }));
          toast("Shift over: you've used all your swipes for today.");
        } else if (error.message.includes("superlike_limit")) {
          setQuota((q) => ({ ...q, used: q.quota ?? q.used }));
          toast("No Super Likes left today.");
          if (vipEnabled && !me.is_vip) setVipOpen(true);
        } else {
          toast.error("Defibrillator misfired. That doctor is back in the deck.");
        }
        return;
      }
      setSwipes((s) => ({ ...s, used: s.used + 1, next_at: s.next_at ?? new Date(Date.now() + 86_400_000).toISOString() }));
      if (dir === "super") setQuota((q) => ({ ...q, used: q.used + 1, next_at: q.next_at ?? new Date(Date.now() + 86_400_000).toISOString() }));
      const result = data as { matched: boolean; match_id?: string };
      setLastSwiped({ doc, dir, matched: Boolean(result.matched) });
      if (result.matched && result.match_id) {
        sounds.fanfare();
        setMatch({ doc, matchId: result.match_id });
        router.refresh();
      } else if (dir === "super") {
        toast.success(`200 joules delivered. ${doc.display_name.split(",")[0]} will see “Superliked you” on your card.`);
      } else if (dir === "right") {
        toast(`Prescribed. Waiting for ${doc.display_name.split(",")[0]}'s rhythm to sync.`);
      }
    },
    [current, leaving, supabase, router, superLeft, me.is_vip, swipesLeft, swipes, quota.next_at, vipEnabled]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || match || radarOpen) return;
      if (e.key === "ArrowLeft") swipe("left");
      if (e.key === "ArrowRight") swipe("right");
      if (e.key === "ArrowUp") {
        e.preventDefault();
        swipe("super");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [swipe, match, radarOpen]);

  /** Undo the last pass or like (not Super Likes, not matches). Free: 1 a day, VIP: unlimited. */
  const rewind = async () => {
    if (leaving) return;
    if (!lastSwiped) return toast("Nothing to rewind yet. Swipe first, regret later.");
    const name = lastSwiped.doc.display_name.split(",")[0];
    if (lastSwiped.dir === "super") return toast("Super Likes can't be rewound. 200 joules is 200 joules.");
    if (lastSwiped.matched) return toast(`You already matched with ${name}. That's a consult now, not a mistake.`);
    if (rewindLeft === 0) {
      toast(vipEnabled ? "Your free rewind is used for today. VIP rewinds without limit." : "Your rewind for today is used. It recharges in 24 hours.");
      if (vipEnabled) setVipOpen(true);
      return;
    }
    const { error } = await supabase.rpc("rewind_last_swipe");
    if (error) {
      if (error.message.includes("rewind_limit")) {
        setRewinds((r) => ({ ...r, used: r.quota ?? r.used }));
        toast(vipEnabled ? "Your free rewind is used for today. VIP rewinds without limit." : "Your rewind for today is used. It recharges in 24 hours.");
        if (vipEnabled) setVipOpen(true);
      } else toast.error("Could not rewind that one. The chart is already signed.");
      return;
    }
    sounds.beep(520);
    const doc = lastSwiped.doc;
    setCandidates((list) => [doc, ...list.filter((d) => d.id !== doc.id)]);
    setIndex(0);
    setLastSwiped(null);
    setRewinds((r) => ({ ...r, used: r.used + 1 }));
    toast.success(`${name} readmitted to triage.`);
  };

  // Drag-to-swipe. Pointer capture starts only after a real drag, so taps still reach the photo buttons.
  const SWIPE_AT = 110;
  const onPointerDown = (e: React.PointerEvent) => {
    // Drags start on the photo only; the action row stays plain buttons.
    if (leaving || e.button !== 0 || (e.target as HTMLElement).closest("[data-no-drag]")) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragged.current = false;
    dragAxis.current = null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const x = e.clientX - dragStart.current.x;
    const y = e.clientY - dragStart.current.y;
    if (!dragged.current && Math.hypot(x, y) > 8) {
      dragAxis.current = Math.abs(x) >= Math.abs(y) ? "x" : y < 0 ? "up" : null;
      if (!dragAxis.current) {
        dragStart.current = null; // downward: not a swipe
        return;
      }
      dragged.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (dragged.current) setDrag(dragAxis.current === "x" ? { x, y: 0 } : { x: 0, y: Math.min(0, y) });
  };
  const onPointerUp = () => {
    if (!dragStart.current) return;
    dragStart.current = null;
    if (!dragged.current || !drag) return setDrag(null);
    if (drag.x > SWIPE_AT) swipe("right");
    else if (drag.x < -SWIPE_AT) swipe("left");
    else if (drag.y < -SWIPE_AT) swipe("super");
    else setDrag(null);
  };

  const stamp = {
    right: leaving === "right" ? 1 : drag ? Math.min(1, Math.max(0, drag.x / SWIPE_AT)) : 0,
    left: leaving === "left" ? 1 : drag ? Math.min(1, Math.max(0, -drag.x / SWIPE_AT)) : 0,
    super: leaving === "super" ? 1 : drag && Math.abs(drag.x) < SWIPE_AT ? Math.min(1, Math.max(0, -drag.y / SWIPE_AT)) : 0,
  };
  const cardTransform = leaving
    ? leaving === "super"
      ? `translate(${drag?.x ?? 0}px, -110vh) rotate(${(drag?.x ?? 0) / 20}deg)`
      : `translate(${leaving === "left" ? "-" : ""}120vw, ${drag?.y ?? 0}px) rotate(${leaving === "left" ? -24 : 24}deg)`
    : drag
      ? `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`
      : undefined;

  const resetPasses = () =>
    startReset(async () => {
      await supabase.rpc("reset_passes");
      toast.success("Discharged doctors readmitted to triage.");
      router.refresh();
    });

  const filters = (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-2">
            <span className="text-body-sm font-medium">Looking for</span>
            <PillTabs tabs={GENDER_TABS} value={seekingToTab(seeking)} onChange={changeSeeking} className="md:w-full [&>button]:flex-1 [&>button]:px-3" />
            <button
              type="button"
              role="switch"
              aria-checked={verifiedOnly}
              onClick={() => changeFilter(() => setVerifiedOnly((v) => !v))}
              className="mt-1 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200 hover:bg-accent"
            >
              <span className="flex items-center gap-2 text-body-sm font-medium">
                <SealCheck weight="fill" className="size-4 text-sky-500" /> Verified doctors only
              </span>
              <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200", verifiedOnly ? "bg-primary" : "bg-muted-foreground/30")}>
                <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all duration-200", verifiedOnly ? "left-[1.125rem]" : "left-0.5")} />
              </span>
            </button>
          </div>

          <div className="grid gap-3 border-t pt-5">
            {activeCountries.length > 1 ? (
              <label className="grid gap-2">
                <span className="text-body-sm font-medium">Country</span>
                <Select value={country} onChange={(e) => changeCountry(e.target.value)} disabled={loadingDeck}>
                  {activeCountries.map((c) => (
                    <option key={c} value={c}>{countryName(c)}</option>
                  ))}
                </Select>
              </label>
            ) : (
              <div className="grid gap-1">
                <span className="text-body-sm font-medium">Country</span>
                <p className="text-body-sm">{countryName(activeCountries[0] ?? "ID")}</p>
                <p className="text-caption text-muted-foreground">Launching in Indonesia first. More countries once the ward fills up.</p>
              </div>
            )}
            <label className="grid gap-2">
              <span className="flex justify-between text-body-sm font-medium">
                Radar radius
                <span className="font-mono tabular-nums text-primary">{nationwide ? "Whole country" : `${radius} km`}</span>
              </span>
              <input
                type="range"
                min={RADIUS_MIN}
                max={RADIUS_MAX}
                step={5}
                value={radius}
                disabled={!hasLocation}
                onChange={(e) =>
                  changeFilter(() => {
                    setRadius(Number(e.target.value));
                    setNationwide(false);
                  })
                }
                className="w-full accent-[hsl(var(--primary))] disabled:opacity-50"
              />
              <span className="flex justify-between text-caption text-muted-foreground tabular-nums">
                <span>{RADIUS_MIN} km</span><span>50 km</span><span>{RADIUS_MAX} km</span>
              </span>
            </label>
            <p className="text-caption text-muted-foreground">
              {hasLocation
                ? "Radar on. Other doctors only ever see a distance, never your location."
                : "Radar off. Scan once to see distances and use the radius."}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { sounds.beep(640); setRadarOpen(true); }}>
                <Broadcast /> {hasLocation ? "Rescan" : "Scan with radar"}
              </Button>
              {hasLocation ? (
                <Button
                  variant={nationwide ? "secondary" : "ghost"}
                  className="flex-1"
                  aria-pressed={nationwide}
                  onClick={() => changeFilter(() => setNationwide((n) => !n))}
                >
                  {nationwide ? "Use radius" : "Whole country"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 border-t pt-5">
            <label className="grid gap-2">
              <span className="text-body-sm font-medium">Target specialty</span>
              <Select value={specialty} onChange={(e) => changeFilter(() => setSpecialty(e.target.value))}>
                <option value="ALL">All specialties (ER compatible)</option>
                {SPECIALTY_KEYS.map((k) => (
                  <option key={k} value={k}>{SPECIALTIES[k].code} ({specialtyLabel(k)}): {SPECIALTIES[k].joke}</option>
                ))}
              </Select>
            </label>
            <div className="grid gap-2">
              <span className="text-body-sm font-medium">Must-have MD traits</span>
              <div className="flex flex-wrap gap-1.5">
                {TRAITS.map((t) => {
                  const on = traits.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setTraits((s) => {
                          const n = new Set(s);
                          if (on) n.delete(t);
                          else n.add(t);
                          return n;
                        })
                      }
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-caption font-medium transition-colors duration-200",
                        on ? "border-primary/30 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-emerald-500/40 font-mono text-caption font-bold tabular-nums text-emerald-500">
            {syncPct}%
          </div>
          <div className="min-w-0">
            <p className="text-overline font-semibold uppercase text-muted-foreground">On-call compatibility</p>
            <p className="text-body-sm font-semibold">Shift schedule synced</p>
            <p className="text-caption text-muted-foreground">Both off-duty Saturday evening post-rounds. Perfect time for a dinner consult.</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1.5 rounded-xl border border-dashed p-5">
        <p className="text-overline font-semibold uppercase text-muted-foreground">Pureblood protocol: MD x MD only</p>
        <blockquote className="text-body-sm italic text-muted-foreground">
          “Because your in-laws will never complain about late-night emergency laparotomies when they are also general surgeons.”
        </blockquote>
        <p className="text-caption font-semibold text-amber-600 dark:text-amber-400">
          Guaranteed 100% illegible handwriting inheritance for the next generation.
        </p>
      </div>
    </div>
  );

  return (
    <main className="pb-dock mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:pb-10">
      <BlurFade>
        <PageHeader
          title="Triage"
          subtitle="Screen board-certified doctors near your base hospital. Defibrillate the ones who make your heart skip."
          action={
            <Button variant="outline" className="lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
              <SlidersHorizontal /> Filters
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className={cn("lg:block", showFilters ? "block" : "hidden")} aria-label="Clinical criteria">
            {filters}
          </aside>

          <section className="mx-auto w-full min-w-0 max-w-[23rem]" aria-label="Doctor deck">
            {radarFallback && current && !loadingDeck ? (
              <p role="status" className="mb-3 flex items-start gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-caption text-muted-foreground">
                <Broadcast className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  No doctors within {radius} km of you yet. Showing the nearest across {countryName(country)}, closest first.
                </span>
              </p>
            ) : null}
            {current ? (
              <article
                key={current.id}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => { dragStart.current = null; setDrag(null); }}
                // Native image drag-and-drop would cancel our pointer stream.
                onDragStart={(e) => e.preventDefault()}
                onClickCapture={(e) => {
                  // A drag that ends over a photo button must not also count as a tap.
                  if (dragged.current) {
                    e.stopPropagation();
                    e.preventDefault();
                    dragged.current = false;
                  }
                }}
                style={{
                  transform: cardTransform,
                  opacity: leaving ? 0 : 1,
                  transition: drag && !leaving ? "none" : "transform 300ms var(--ease-reveal), opacity 300ms ease-out",
                }}
                className={cn(
                  "relative overflow-hidden rounded-xl border bg-card shadow-sm",
                  current.superliked_me && "border-amber-500/60 ring-2 ring-amber-500/30"
                )}
              >
                <DoctorPhotoPanel doc={current} online={currentOnline} priority tapNav className="aspect-[4/5] cursor-grab touch-none select-none active:cursor-grabbing">
                  {/* Prescription stamps: they ink in as the card is dragged. */}
                  <span
                    aria-hidden
                    style={{ opacity: stamp.right }}
                    className="pointer-events-none absolute left-5 top-16 z-20 -rotate-12 rounded-lg border-[3px] border-primary bg-white/10 px-3 py-1 font-mono text-h5 font-bold tracking-wider text-primary backdrop-blur-[2px]"
                  >
                    PRESCRIBED
                  </span>
                  <span
                    aria-hidden
                    style={{ opacity: stamp.left }}
                    className="pointer-events-none absolute right-5 top-16 z-20 rotate-12 rounded-lg border-[3px] border-white bg-black/10 px-3 py-1 font-mono text-h5 font-bold tracking-wider text-white backdrop-blur-[2px]"
                  >
                    DISCHARGED
                  </span>
                  <span
                    aria-hidden
                    style={{ opacity: stamp.super }}
                    className="pointer-events-none absolute inset-x-0 top-1/3 z-20 mx-auto w-fit -rotate-6 rounded-lg border-[3px] border-amber-400 bg-black/10 px-3 py-1 text-center font-mono text-h5 font-bold tracking-wider text-amber-400 backdrop-blur-[2px]"
                  >
                    DEFIBRILLATED ⚡
                  </span>
                </DoctorPhotoPanel>

                {/* Actions right under the photo: reachable without scrolling. */}
                <div data-no-drag className="flex items-center justify-center gap-3.5 py-4">
                  <Button
                      variant="outline"
                      className="size-11 rounded-full text-amber-500 [&_svg:not([class*='size-'])]:size-5"
                      onClick={rewind}
                      disabled={!lastSwiped || lastSwiped.dir === "super" || lastSwiped.matched}
                      aria-label={`Rewind last swipe (${rewindLeft === Infinity ? "unlimited" : `${rewindLeft} left today`})`}
                      title="Rewind last swipe"
                    >
                      <ArrowUUpLeft weight="bold" />
                    </Button>
                  <Button
                    variant="outline"
                    className="size-14 rounded-full [&_svg:not([class*='size-'])]:size-6"
                    onClick={() => swipe("left")}
                    aria-label="Discharge (pass)"
                    title="Discharge (←)"
                  >
                    <X weight="bold" />
                  </Button>
                  <div className="relative">
                    <Button
                      className="size-16 rounded-full bg-amber-400 text-neutral-900 hover:bg-amber-400/90 [&_svg:not([class*='size-'])]:size-7"
                      onClick={() => swipe("super")}
                      aria-label={`Defibrillate: Super Like (${superLeft === Infinity ? "unlimited" : `${superLeft} left today`})`}
                      title="Defibrillate: Super Like (↑)"
                    >
                      <Lightning weight="fill" />
                    </Button>
                    <span
                      aria-hidden
                      className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full border-2 border-card bg-foreground text-caption font-bold text-background tabular-nums"
                    >
                      {superLeft === Infinity ? "∞" : superLeft}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    className="size-14 rounded-full text-primary [&_svg:not([class*='size-'])]:size-6"
                    onClick={() => swipe("right")}
                    aria-label="Prescribe (like)"
                    title="Prescribe: like (→)"
                  >
                    <Pill weight="fill" />
                  </Button>
                </div>

                {/* Full chart, right on the card: scroll down to read it. */}
                <div data-no-drag className="space-y-4 border-t p-5">
                  <DoctorDetails doc={current} />
                  <div className="flex justify-center gap-1 border-t pt-3">
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSafety({ mode: "report", doc: current })}>
                      <Flag /> Report
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSafety({ mode: "block", doc: current })}>
                      <Prohibit /> Block
                    </Button>
                  </div>
                </div>
              </article>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border px-4 py-16 text-center">
                <p className="font-semibold">No doctors found</p>
                <p className="mt-1 max-w-[36ch] text-body-sm text-muted-foreground">
                  All doctors currently in emergency surgery. We just opened, so the roster is still growing: invite your colleagues, try the whole country, or readmit the ones you discharged.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {!nationwide ? (
                    <Button variant="outline" onClick={() => { setNationwide(true); setIndex(0); }}>Show whole country</Button>
                  ) : null}
                  {verifiedOnly ? (
                    <Button variant="outline" onClick={() => changeFilter(() => setVerifiedOnly(false))}>Show unverified too</Button>
                  ) : null}
                  <Button onClick={resetPasses} disabled={resetting}>
                    <ArrowCounterClockwise /> {resetting ? "Readmitting…" : "Readmit discharged"}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-3 space-y-1 text-center text-caption text-muted-foreground tabular-nums">
              {swipes.quota != null ? (
                <p className={cn(swipesLeft === 0 && "font-medium text-red-500")} suppressHydrationWarning>
                  {swipesLeft > 0
                    ? `${swipesLeft} of ${swipes.quota} swipes left today`
                    : `Shift over. Swipes recharge at ${rechargeAt(swipes.next_at)}`}
                </p>
              ) : null}
              <p suppressHydrationWarning>
                {superLeft === Infinity
                  ? "Founder: unlimited swipes, Super Likes and rewinds"
                  : superLeft > 0
                  ? `${superLeft} of ${quota.quota} Super ${quota.quota === 1 ? "Like" : "Likes"} left today`
                  : `Super Likes recharge ${quota.next_at ? new Date(quota.next_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "tomorrow"}`}
                {vipEnabled && !me.is_vip ? (
                  <>
                    {", "}
                    <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => setVipOpen(true)}>
                      VIP gets 5 a day
                    </button>
                  </>
                ) : null}
              </p>
              <p className="flex flex-wrap items-center justify-center gap-x-3">
                <span>{filtered.length} doctors in triage</span>
                <span className="lg:hidden">Drag the photo to swipe, scroll for the full chart</span>
                <span className="flex items-center gap-1"><SealCheck weight="fill" className="size-3.5 text-sky-500" /> ID and license verified</span>
              </p>
              <p className="hidden lg:block">Keys: ← pass, ↑ super like, → like. Or drag the photo.</p>
            </div>
          </section>
        </div>
      </BlurFade>

      <Modal open={radarOpen} onClose={() => setRadarOpen(false)} labelledBy="radar-title" className="text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Broadcast className="size-8 animate-pulse" />
        </div>
        <h2 id="radar-title" className="mt-4 text-lead font-bold">Scan nearest doctors?</h2>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Activate clinical ultrasound radar to find doctors within <strong className="text-foreground">{radius} km</strong>.
          Your browser asks for your location once. We round it to about 1 km, and other doctors only ever see a distance.
        </p>
        <div className="mt-6 grid gap-2">
          <Button onClick={scanRadar} disabled={scanning}>
            {scanning ? "Calibrating radar…" : "Use my location"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setRadarOpen(false);
              setNationwide(true);
              setIndex(0);
            }}
          >
            Show everyone in {countryName(country)}
          </Button>
        </div>
      </Modal>

      <Modal open={!!match} onClose={() => setMatch(null)} labelledBy="match-title" className="text-center">
        {match ? (
          <>
            {me.intent === "connect" ? (
              <>
                <StatusPill status="upcoming" className="mx-auto">Colleague connected</StatusPill>
                <h2 id="match-title" className="mt-4 text-h5 font-extrabold">New colleague on your ward!</h2>
                <p className="mt-2 text-body-sm text-muted-foreground">
                  You both swiped right. Say hi, talk shop, swap referral tips. Write within 24 hours or the connection flatlines.
                </p>
              </>
            ) : (
              <>
                <StatusPill status="cancelled" className="mx-auto">Code pink: resuscitation match</StatusPill>
                <h2 id="match-title" className="mt-4 text-h5 font-extrabold">It&apos;s a clinical match!</h2>
                <p className="mt-2 text-body-sm text-muted-foreground">
                  Your vital signs synchronized. Both STR licenses have been cross-verified for pureblood offspring potential.
                </p>
              </>
            )}
            <div className="my-6 flex items-center justify-center">
              <DoctorPhoto src={me.photo_url} alt="You" size={80} className="ring-4 ring-card" />
              <span className="z-10 -mx-3 grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
                <HeartStraight weight="fill" className="size-5" />
              </span>
              <span className="relative">
                <DoctorPhoto src={match.doc.photo_url} fallback={match.doc.photo_fallback_url} alt={match.doc.display_name} size={80} className="ring-4 ring-card" />
                <OnlineDot id={match.doc.id} isBot={match.doc.is_bot} className="bottom-1 right-1 size-4 ring-card" />
              </span>
            </div>
            <div className="grid gap-2">
              <Button asChild>
                <Link href={`/chat/${match.matchId}`}>{me.intent === "connect" ? "Say hi now" : "Initiate resuscitation (chat now)"}</Link>
              </Button>
              <Button variant="ghost" onClick={() => setMatch(null)}>Keep screening doctors</Button>
            </div>
          </>
        ) : null}
      </Modal>
      {vipEnabled ? <VipDialog open={vipOpen} country={me.country ?? "ID"} onClose={() => setVipOpen(false)} onChange={() => router.refresh()} /> : null}

      {safety ? (
        <SafetyDialog
          open
          mode={safety.mode}
          target={{ id: safety.doc.id, name: safety.doc.display_name.split(",")[0] }}
          onClose={() => setSafety(null)}
          onBlocked={() => {
            const id = safety.doc.id;
            setCandidates((list) => list.filter((d) => d.id !== id));
          }}
        />
      ) : null}
    </main>
  );
}
