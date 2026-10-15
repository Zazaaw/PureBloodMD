"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PauseCircle, PlayCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

/**
 * Pause the account (hidden everywhere, reversible). Self-service deletion is switched
 * off during early access; delete_my_account() stays in the database for when it returns.
 */
export function AccountCard({ paused, vipEnabled }: { paused: boolean; vipEnabled: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const setActive = (active: boolean) =>
    start(async () => {
      const { error } = await supabase.rpc("set_account_active", { p_active: active });
      if (error) return void toast.error("Could not update your account. Try again.");
      setOpen(false);
      toast.success(active ? "Welcome back to the ward. You're visible again." : "Account paused. Nobody can see you or message you.");
      router.refresh();
    });

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Need a break from the ward? Pause any time and come back whenever you like.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              {paused ? <PlayCircle className="size-5" /> : <PauseCircle className="size-5" />}
              {paused ? "Your account is paused" : "Deactivate account"}
            </p>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {paused
                ? "You're hidden from triage and consults. Reactivate to pick up where you left off."
                : "Hide your profile from triage and consults. Your data stays, and you can come back any time."}
            </p>
          </div>
          <Button variant="outline" className="w-fit shrink-0" disabled={pending} onClick={() => (paused ? setActive(true) : setOpen(true))}>
            {paused ? "Reactivate account" : "Deactivate"}
          </Button>
        </div>
      </CardContent>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="pause-title">
        <PauseCircle className="size-8 text-muted-foreground" />
        <h2 id="pause-title" className="mt-3 text-lead font-bold">Deactivate your account?</h2>
        <ul className="mt-3 space-y-1.5 text-body-sm text-muted-foreground">
          <li>You disappear from everyone&apos;s triage and consults.</li>
          <li>Nobody can message you, and you can&apos;t message anyone.</li>
          <li>Consults still end on schedule: 24 hours if nobody has written, 30 days of silence otherwise.</li>
          {vipEnabled ? <li>Your VIP keeps running. Cancel it in the VIP tab if you want.</li> : null}
        </ul>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button onClick={() => setActive(false)} disabled={pending}>{pending ? "Pausing…" : "Deactivate"}</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </Card>
  );
}
