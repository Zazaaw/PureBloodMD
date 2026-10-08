"use client";

import { useState, useTransition } from "react";
import { Flag, Prohibit, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Textarea } from "@/components/form/field";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { REPORT_REASONS, type ReportReason } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  target: { id: string; name: string };
  matchId?: string;
  /** "report" opens on the reasons list, "block" on the block confirmation. */
  mode: "report" | "block";
  /** Called after a block (including report + block). */
  onBlocked?: () => void;
};

/**
 * One dialog for both safety actions. Reporting blocks by default, because
 * someone who harassed you should not be able to keep messaging you while the
 * report is reviewed.
 */
export function SafetyDialog({ open, onClose, target, matchId, mode, onBlocked }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [pending, start] = useTransition();
  const supabase = createClient();

  const close = () => {
    setReason(null);
    setDetails("");
    setAlsoBlock(true);
    onClose();
  };

  const submitReport = () =>
    start(async () => {
      if (!reason) return;
      if (reason === "other" && details.trim().length < 5) {
        toast.error("Tell us a little about what happened.");
        return;
      }
      const { error } = await supabase.rpc("report_profile", {
        p_target: target.id,
        p_reason: reason,
        p_details: details,
        p_match: matchId ?? null,
        p_block: alsoBlock,
      });
      if (error) {
        toast.error(error.message.includes("too_many_reports") ? "Too many reports today. Try again tomorrow." : "Report failed. Try again.");
        return;
      }
      toast.success(alsoBlock ? "Report sent and profile blocked. Thank you for keeping the ward safe." : "Report sent. Thank you for keeping the ward safe.");
      close();
      if (alsoBlock) onBlocked?.();
    });

  const block = () =>
    start(async () => {
      const { error } = await supabase.rpc("block_profile", { p_target: target.id });
      if (error) {
        toast.error("Block failed. Try again.");
        return;
      }
      toast.success(`${target.name} is blocked.`);
      close();
      onBlocked?.();
    });

  return (
    <Modal open={open} onClose={close} labelledBy="safety-title" className="max-w-lg">
      {mode === "block" ? (
        <>
          <Prohibit className="size-8 text-red-500" />
          <h2 id="safety-title" className="mt-3 text-lead font-bold">Block {target.name}?</h2>
          <ul className="mt-3 space-y-1.5 text-body-sm text-muted-foreground">
            <li>They disappear from your triage and consults, and you from theirs.</li>
            <li>Neither of you can send messages or photos to the other.</li>
            <li>They are not told that you blocked them. You can unblock in Passport.</li>
          </ul>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button variant="destructive" onClick={block} disabled={pending}>
              {pending ? "Blocking…" : "Block"}
            </Button>
            <Button variant="ghost" onClick={close}>Cancel</Button>
          </div>
        </>
      ) : (
        <>
          <Flag className="size-8 text-red-500" />
          <h2 id="safety-title" className="mt-3 text-lead font-bold">Report {target.name}</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Reports are confidential. {target.name} will not know who reported them.
          </p>

          <fieldset className="mt-4 grid max-h-[45dvh] gap-2 overflow-y-auto pr-1">
            <legend className="sr-only">What happened?</legend>
            {REPORT_REASONS.map((r) => (
              <label
                key={r.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors duration-200 hover:bg-accent",
                  reason === r.value && "border-red-500/40 bg-red-500/10"
                )}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="mt-1 accent-[hsl(var(--primary))]"
                />
                <span>
                  <span className="block text-body-sm font-semibold">{r.label}</span>
                  <span className="block text-caption text-muted-foreground">{r.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <label htmlFor="report-details" className="mt-4 block text-body-sm font-medium">
            Details {reason === "other" ? "(required)" : "(optional)"}
          </label>
          <Textarea
            id="report-details"
            className="mt-2"
            maxLength={1000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What happened, and when? The conversation is attached to the report automatically."
          />

          <label className="mt-4 flex items-center gap-2 text-body-sm">
            <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} className="accent-[hsl(var(--primary))]" />
            Also block {target.name}
          </label>

          {reason === "self_harm" ? (
            <p className="mt-3 flex gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-caption text-blue-600 dark:text-blue-400">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              If someone is in immediate danger, call 112 (Indonesia emergency) or the Kemenkes mental health line 119 ext. 8.
            </p>
          ) : null}

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button variant="destructive" onClick={submitReport} disabled={!reason || pending}>
              {pending ? "Sending…" : "Send report"}
            </Button>
            <Button variant="ghost" onClick={close}>Cancel</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
