"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Prohibit } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Textarea } from "@/components/form/field";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const REASONS = [
  "Scam: asked for money, transfers or e-wallet top-ups.",
  "Sexual harassment or unsolicited explicit content.",
  "Fake profile: not a real doctor or not a real person.",
  "Harassment, threats or hate speech toward members.",
  "Underage user.",
  "Spam or advertising.",
];

/** Ban flow shared by Reports and the user page: pick or write a reason (it is emailed to them). */
export function BanButton({ profileId, name, size = "default" }: { profileId: string; name: string; size?: "default" | "sm" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const ban = () =>
    start(async () => {
      const { error } = await createClient().rpc("admin_ban_user", { p_profile: profileId, p_reason: reason });
      if (error) return void toast.error(error.message.includes("reason_required") ? "Pick or write a reason." : "Could not ban. Try again.");
      toast.success(`${name} is banned. They were signed out and emailed.`);
      setOpen(false);
      setReason("");
      router.refresh();
    });

  return (
    <>
      <Button variant="destructive" size={size} onClick={() => setOpen(true)}>
        <Prohibit /> Ban account
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={`ban-${profileId}`} className="max-w-lg">
        <h2 id={`ban-${profileId}`} className="text-lead font-bold">Ban {name}?</h2>
        <ul className="mt-2 space-y-1 text-body-sm text-muted-foreground">
          <li>They can&apos;t sign in anymore and disappear from triage, consults and EMR.</li>
          <li>Open reports about them are closed as actioned.</li>
          <li>They get an email with the reason below. You can unban later.</li>
        </ul>
        <p className="mt-4 text-body-sm font-medium">Reason (sent to them)</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-left text-caption transition-colors duration-200",
                reason === r ? "border-red-500/40 bg-red-500/10 text-red-500" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <Textarea className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Or write your own." />
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button variant="destructive" onClick={ban} disabled={pending || !reason.trim()}>{pending ? "Banning…" : "Ban account"}</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </>
  );
}

/** Small RPC buttons used across the dashboard (unban, badge, report status, delete post). */
export function RpcButton({
  fn,
  args,
  label,
  done,
  variant = "outline",
  size = "default",
  confirm,
  icon,
}: {
  fn: string;
  args: Record<string, unknown>;
  label: string;
  done: string;
  variant?: "outline" | "ghost" | "default" | "destructive" | "secondary";
  size?: "default" | "sm";
  confirm?: string;
  icon?: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const { error } = await createClient().rpc(fn, args);
          if (error) return void toast.error("That didn't work. Refresh and try again.");
          toast.success(done);
          router.refresh();
        });
      }}
    >
      {icon}
      {pending ? "Working…" : label}
    </Button>
  );
}
