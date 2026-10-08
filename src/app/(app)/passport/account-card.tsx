"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PauseCircle, PlayCircle, Trash, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const CONFIRM_WORD = "DELETE";

/** Pause (hide everywhere, reversible) or permanently delete the account. */
export function AccountCard({ userId, paused }: { userId: string; paused: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<"pause" | "delete" | null>(null);
  const [typed, setTyped] = useState("");

  const setActive = (active: boolean) =>
    start(async () => {
      const { error } = await supabase.rpc("set_account_active", { p_active: active });
      if (error) return void toast.error("Could not update your account. Try again.");
      setDialog(null);
      toast.success(active ? "Welcome back to the ward. You're visible again." : "Account paused. Nobody can see you or message you.");
      router.refresh();
    });

  const deleteAccount = () =>
    start(async () => {
      // Own photos first (the database can't delete storage files); chat photos are
      // queued for cleanup automatically when the messages cascade away.
      const { data: files } = await supabase.storage.from("avatars").list(userId, { limit: 100 });
      if (files?.length) await supabase.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
      const { error } = await supabase.rpc("delete_my_account");
      if (error) return void toast.error("Could not delete your account. Try again or contact support.");
      // The user no longer exists server-side, so only clear the local session cookies.
      await supabase.auth.signOut({ scope: "local" });
      // Full reload: the session is gone, so nothing from the app shell should survive.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a hard reload is the point here
      window.location.assign("/?account=deleted");
    });

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Take a break, or leave for good.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg border p-4">
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
          <Button
            variant="outline"
            className="mt-auto w-fit"
            disabled={pending}
            onClick={() => (paused ? setActive(true) : setDialog("pause"))}
          >
            {paused ? "Reactivate account" : "Deactivate"}
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-red-500/30 p-4">
          <div>
            <p className="flex items-center gap-2 font-semibold text-red-500">
              <Trash className="size-5" /> Delete account
            </p>
            <p className="mt-1 text-body-sm text-muted-foreground">
              Permanently delete your passport, photos, matches and messages. This can&apos;t be undone.
            </p>
          </div>
          <Button variant="destructive" className="mt-auto w-fit" disabled={pending} onClick={() => setDialog("delete")}>
            Delete account
          </Button>
        </div>
      </CardContent>

      <Modal open={dialog === "pause"} onClose={() => setDialog(null)} labelledBy="pause-title">
        <PauseCircle className="size-8 text-muted-foreground" />
        <h2 id="pause-title" className="mt-3 text-lead font-bold">Deactivate your account?</h2>
        <ul className="mt-3 space-y-1.5 text-body-sm text-muted-foreground">
          <li>You disappear from everyone&apos;s triage and consults.</li>
          <li>Nobody can message you, and you can&apos;t message anyone.</li>
          <li>Consults still flatline after 24 hours without a message.</li>
          <li>Your VIP keeps running. Cancel it in the VIP tab if you want.</li>
        </ul>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button onClick={() => setActive(false)} disabled={pending}>{pending ? "Pausing…" : "Deactivate"}</Button>
          <Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
        </div>
      </Modal>

      <Modal
        open={dialog === "delete"}
        onClose={() => {
          setDialog(null);
          setTyped("");
        }}
        labelledBy="delete-title"
      >
        <Warning className="size-8 text-red-500" />
        <h2 id="delete-title" className="mt-3 text-lead font-bold">Delete your account forever?</h2>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Your passport, photos, swipes, matches and every message are deleted right away, for you and the people you
          talked to. Reports you filed stay with our safety team. This can&apos;t be undone.
        </p>
        <label htmlFor="delete-confirm" className="mt-4 block text-body-sm font-medium">
          Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm
        </label>
        <Input id="delete-confirm" className="mt-2 font-mono" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button variant="destructive" onClick={deleteAccount} disabled={pending || typed.trim() !== CONFIRM_WORD}>
            {pending ? "Deleting…" : "Delete forever"}
          </Button>
          <Button variant="ghost" onClick={() => { setDialog(null); setTyped(""); }}>Cancel</Button>
        </div>
      </Modal>
    </Card>
  );
}
