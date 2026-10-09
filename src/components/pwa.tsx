"use client";

import { useEffect, useState } from "react";
import { DeviceMobile, DownloadSimple, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

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

/** "Install app" card: native prompt on Chrome/Android, instructions on iPhone. */
export function InstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<"unknown" | "installed" | "ios" | "other">("unknown");

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const t = setTimeout(() => setState(standalone ? "installed" : ios ? "ios" : "other"), 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  if (state === "unknown" || state === "installed") return null;

  return (
    <div className="flex gap-3 rounded-xl border bg-card p-5 shadow-sm">
      <DeviceMobile className="mt-0.5 size-6 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="font-semibold">Install PureBloodMD</p>
        {state === "ios" ? (
          <p className="mt-1 text-body-sm text-muted-foreground">
            In Safari, tap <Export className="inline size-4 align-text-bottom" aria-label="Share" /> Share, then
            &ldquo;Add to Home Screen&rdquo;. It opens full screen, like a real app.
          </p>
        ) : (
          <>
            <p className="mt-1 text-body-sm text-muted-foreground">Full screen, its own icon, faster to open between shifts.</p>
            {deferred ? (
              <Button
                size="sm"
                className="mt-3"
                onClick={async () => {
                  await deferred.prompt();
                  await deferred.userChoice;
                  setDeferred(null);
                }}
              >
                <DownloadSimple /> Install app
              </Button>
            ) : (
              <p className="mt-2 text-caption text-muted-foreground">Use your browser menu: &ldquo;Install app&rdquo; or &ldquo;Add to Home Screen&rdquo;.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
