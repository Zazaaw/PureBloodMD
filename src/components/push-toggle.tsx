"use client";

import { useEffect, useState } from "react";
import { Bell, BellSlash, BellRinging } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { disablePush, enablePush, isStandalone, pushState, syncPush, type PushState } from "@/lib/push";

function usePush() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    pushState().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);
  const run = async (fn: typeof enablePush) => {
    setBusy(true);
    try {
      const next = await fn(createClient());
      setState(next);
      return next;
    } catch {
      toast.error("Could not change notifications. Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { state, busy, enable: () => run(enablePush), disable: () => run(disablePush) };
}

/** Passport > Settings: notifications for matches and messages on this device. */
export function PushCard() {
  const { state, busy, enable, disable } = usePush();
  if (state === null) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {state === "on" ? <BellRinging className="size-5" /> : <Bell className="size-5" />} Notifications
        </CardTitle>
        <CardDescription>A ping on this device when you match or get a new message.</CardDescription>
      </CardHeader>
      <CardContent>
        {state === "on" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm text-muted-foreground">On for this device.</p>
            <Button variant="outline" size="sm" disabled={busy} onClick={async () => (await disable()) === "off" && toast("Notifications off on this device.")}>
              <BellSlash /> Turn off
            </Button>
          </div>
        ) : state === "off" ? (
          <Button disabled={busy} onClick={async () => (await enable()) === "on" && toast.success("Notifications on. We'll page you.")}>
            <Bell /> {busy ? "Turning on…" : "Turn on notifications"}
          </Button>
        ) : (
          <p className="text-body-sm text-muted-foreground">
            {state === "needs-install"
              ? "On iPhone, add PureBloodMD to your home screen first (Share, then Add to Home Screen), open it from there, then turn notifications on here."
              : state === "denied"
                ? "Notifications are blocked for PureBloodMD. Allow them in your browser or phone settings, then come back."
                : "This browser can't show notifications. Try Chrome, or add PureBloodMD to your home screen."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const NUDGE_KEY = "pbmd-push-nudge";

/**
 * One-time ask inside the app. Only where it can work right away: the installed app,
 * or a desktop browser (phones in a browser tab get the install guide first).
 * Also keeps an existing subscription tied to whoever is signed in.
 */
export function PushNudge() {
  const { state, busy, enable } = usePush();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    syncPush(createClient());
  }, []);

  useEffect(() => {
    if (state !== "off") return;
    const mobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (mobile && !isStandalone()) return;
    let snoozed = 0;
    try {
      snoozed = Number(localStorage.getItem(NUDGE_KEY) ?? 0);
    } catch {}
    if (snoozed > Date.now()) return;
    const t = setTimeout(() => setOpen(true), 3000);
    return () => clearTimeout(t);
  }, [state]);

  const snooze = (days: number) => {
    try {
      localStorage.setItem(NUDGE_KEY, String(Date.now() + days * 86_400_000));
    } catch {}
    setOpen(false);
  };

  if (state !== "off") return null;
  return (
    <Modal open={open} onClose={() => snooze(7)} labelledBy="push-nudge-title">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <BellRinging weight="fill" className="size-6" />
      </span>
      <h2 id="push-nudge-title" className="mt-4 text-lead font-bold">Want us to page you?</h2>
      <p className="mt-1 text-body-sm text-muted-foreground">
        Get a notification when you match or a doctor writes to you, even when the app is closed. No spam, only your consults.
      </p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button
          disabled={busy}
          onClick={async () => {
            const next = await enable();
            if (next === "on") toast.success("Notifications on. We'll page you.");
            snooze(next === "on" ? 3650 : 7);
          }}
        >
          <Bell /> {busy ? "Turning on…" : "Turn on"}
        </Button>
        <Button variant="ghost" onClick={() => snooze(7)}>Not now</Button>
      </div>
    </Modal>
  );
}
