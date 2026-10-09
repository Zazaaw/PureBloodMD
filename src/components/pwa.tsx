"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut, DeviceMobile, DotsThreeVertical, DownloadSimple, Export, PlusSquare } from "@phosphor-icons/react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Registers the service worker in production only: in dev, Turbopack serves
 * unhashed chunks that a cache-first worker would keep stale.
 */
export function PwaRegister() {
  // iOS Safari ignores user-scalable=no in a browser tab; block its pinch gesture directly.
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop, { passive: false });
    return () => document.removeEventListener("gesturestart", stop);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Where the page is open, which decides the install steps. */
type Platform = "unknown" | "installed" | "ios-safari" | "ios-chrome" | "android" | "in-app" | "desktop";

function detectPlatform(): Platform {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) return "installed";
  const ua = nav.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && nav.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  // Gmail, Instagram, Facebook, LINE, TikTok and friends open links in their own browser,
  // which can't add to the home screen.
  const inApp = /FBAN|FBAV|Instagram|Line\/|GSA\/|Twitter|TikTok|musical_ly|; wv\)/i.test(ua) || (ios && !/safari/i.test(ua));
  if (inApp && (ios || android)) return "in-app";
  if (ios) return /CriOS|EdgiOS|FxiOS/i.test(ua) ? "ios-chrome" : "ios-safari";
  if (android) return "android";
  return "desktop";
}

/** Platform + Chrome's native install prompt, when the browser offers one. */
function useInstall() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPlatform("installed");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const t = setTimeout(() => setPlatform(detectPlatform()), 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setPlatform("installed");
  };
  return { platform, canPrompt: Boolean(deferred), install };
}

const Key = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-1.5 py-0.5 align-middle text-caption font-semibold text-foreground">{children}</span>
);

/** The numbered steps for this phone. */
function Steps({ platform, canPrompt, install }: ReturnType<typeof useInstall>) {
  const steps: React.ReactNode[] =
    platform === "ios-safari"
      ? [
          <>Tap <Key><Export className="size-3.5" /> Share</Key> in Safari&apos;s bar. On newer iPhones it sits under <Key>•••</Key>.</>,
          <>Scroll down and tap <Key><PlusSquare className="size-3.5" /> Add to Home Screen</Key>.</>,
          <>Tap <Key>Add</Key>, then open PureBloodMD from your home screen.</>,
        ]
      : platform === "ios-chrome"
        ? [
            <>Tap <Key><Export className="size-3.5" /> Share</Key> at the right of the address bar.</>,
            <>Tap <Key><PlusSquare className="size-3.5" /> Add to Home Screen</Key>.</>,
            <>Tap <Key>Add</Key>, then open PureBloodMD from your home screen.</>,
          ]
        : platform === "android"
          ? [
              <>Tap <Key><DotsThreeVertical weight="bold" className="size-3.5" /></Key> at the top right of Chrome.</>,
              <>Tap <Key>Install app</Key> or <Key>Add to Home screen</Key>.</>,
              <>Tap <Key>Install</Key>, then open PureBloodMD from your home screen.</>,
            ]
          : platform === "in-app"
            ? [
                <>This page is open inside another app (like Gmail or Instagram), which can&apos;t install it.</>,
                <>Tap <Key><DotsThreeVertical weight="bold" className="size-3.5" /></Key> or <Key><ArrowSquareOut className="size-3.5" /></Key> and choose <Key>Open in Safari</Key> or <Key>Open in Chrome</Key>.</>,
                <>Sign in once more there, then follow the steps it shows you.</>,
              ]
            : [<>Open <span className="font-medium text-foreground">purebloodmd.com</span> on your phone and this guide shows the steps for it.</>];

  return (
    <div className="space-y-3">
      {platform === "android" && canPrompt ? (
        <Button className="w-full" onClick={install}><DownloadSimple /> Install app</Button>
      ) : null}
      {platform === "android" && canPrompt ? <p className="text-caption text-muted-foreground">Button not working? Do it by hand:</p> : null}
      <ol className="space-y-2.5 text-left">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-body-sm text-muted-foreground">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-caption font-bold text-primary tabular-nums">{i + 1}</span>
            <span className="min-w-0 leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const PITCH = "Full screen with its own icon, like a real app. Faster to open between shifts.";

/** "Install app" card: Passport and the welcome page. Hidden once installed. */
export function InstallApp({ className, title = "Install PureBloodMD", mobileOnly = false }: { className?: string; title?: string; mobileOnly?: boolean }) {
  const state = useInstall();
  if (state.platform === "unknown" || state.platform === "installed") return null;
  if (mobileOnly && state.platform === "desktop") return null;
  return (
    <div className={cn("rounded-xl border bg-card p-5 text-left shadow-sm", className)}>
      <div className="flex gap-3">
        <DeviceMobile className="mt-0.5 size-6 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-body-sm text-muted-foreground">{PITCH}</p>
        </div>
      </div>
      <div className="mt-4">
        <Steps {...state} />
      </div>
    </div>
  );
}

const NUDGE_KEY = "pbmd-install-nudge";
const NUDGE_SNOOZE_MS = 7 * 86_400_000;

/**
 * One-time nudge inside the app on phones that haven't added it to the home screen.
 * "Later" hides it for a week; "Don't show again" for good (this browser only).
 */
export function InstallNudge() {
  const state = useInstall();
  const [open, setOpen] = useState(false);
  const mobile = state.platform !== "unknown" && state.platform !== "installed" && state.platform !== "desktop";

  useEffect(() => {
    if (!mobile) return;
    let snoozedUntil = 0;
    try {
      snoozedUntil = Number(localStorage.getItem(NUDGE_KEY) ?? 0);
    } catch {}
    if (snoozedUntil > Date.now()) return;
    const t = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(t);
  }, [mobile]);

  const snooze = (ms: number) => {
    try {
      localStorage.setItem(NUDGE_KEY, String(Date.now() + ms));
    } catch {}
    setOpen(false);
  };

  if (!mobile) return null;
  return (
    <Modal open={open} onClose={() => snooze(NUDGE_SNOOZE_MS)} labelledBy="install-nudge-title">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <DeviceMobile weight="fill" className="size-6" />
      </span>
      <h2 id="install-nudge-title" className="mt-4 text-lead font-bold">Put PureBloodMD on your home screen</h2>
      <p className="mt-1 text-body-sm text-muted-foreground">{PITCH} Takes 10 seconds, no app store.</p>
      <div className="mt-5">
        <Steps {...state} />
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={() => snooze(NUDGE_SNOOZE_MS)}>Later</Button>
        <Button variant="ghost" className="text-muted-foreground" onClick={() => snooze(100 * 365 * 86_400_000)}>Don&apos;t show again</Button>
      </div>
    </Modal>
  );
}
