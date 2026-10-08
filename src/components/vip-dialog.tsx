"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle, Crown } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { PLANS, VIP_PERKS, formatMoney, planPrice, type PlanId } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { sounds } from "@/lib/sounds";
import type { Subscription } from "@/lib/types";
import { cn } from "@/lib/utils";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/**
 * Subscribe, cancel or resume. Cancelling keeps VIP until the end of the period
 * that was paid for; nothing turns off early. Demo mode: no real payment.
 */
export function VipDialog({
  open,
  onClose,
  country,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  country: string;
  /** Called after any successful change, with the new VIP state. */
  onChange?: (isVip: boolean) => void;
}) {
  const [sub, setSub] = useState<Subscription | null | undefined>(undefined);
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [pending, start] = useTransition();
  const supabase = createClient();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    supabase.rpc("get_my_subscription").then(({ data }) => {
      if (alive) setSub(((data ?? []) as Subscription[])[0] ?? null);
    });
    return () => {
      alive = false;
    };
  }, [open, supabase]);

  const active = sub?.active ?? false;

  const run = (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string, nowVip: boolean) =>
    start(async () => {
      const { error } = await fn();
      if (error) {
        toast.error(
          error.message.includes("Could not find the function")
            ? "Run supabase/migrations/0004 in the SQL Editor first."
            : "The billing ward is busy. Try again."
        );
        return;
      }
      if (nowVip) sounds.fanfare();
      toast.success(ok);
      onChange?.(nowVip);
      onClose();
    });

  const subscribe = () => {
    const p = PLANS.find((x) => x.id === plan)!;
    const price = planPrice(country, p);
    run(
      () => supabase.rpc("subscribe_vip_demo", { p_plan: plan }),
      `VIP active: ${p.label} for ${formatMoney(price.amount, price.currency)}. Unlimited resuscitation unlocked.`,
      true
    );
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="vip-title" className="max-w-lg">
      <div className="flex items-center gap-2 text-overline font-semibold uppercase text-amber-500">
        <Crown weight="fill" className="size-4" /> PureBlood VIP pass
      </div>

      {sub === undefined ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          <div className="h-7 w-48 animate-pulse rounded-md bg-foreground/10" />
          <div className="h-24 animate-pulse rounded-xl bg-foreground/10" />
        </div>
      ) : active && sub ? (
        <>
          <h2 id="vip-title" className="mt-3 text-h5 font-bold">Your VIP subscription</h2>
          <dl className="mt-4 space-y-2 rounded-xl border p-4 text-body-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-semibold">{PLANS.find((p) => p.id === sub.plan)?.label}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-mono tabular-nums">{formatMoney(Number(sub.amount), sub.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subscribed</dt>
              <dd>{longDate(sub.started_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{sub.cancel_at_period_end ? "VIP ends" : "Renews"}</dt>
              <dd className="font-semibold">{longDate(sub.period_end)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                {sub.cancel_at_period_end ? (
                  <StatusPill status="pending">Cancelled, active until end</StatusPill>
                ) : (
                  <StatusPill status="completed">Active</StatusPill>
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-body-sm text-muted-foreground">
            {sub.cancel_at_period_end
              ? `You keep unlimited bubbles until ${longDate(sub.period_end)}. After that the 10-bubble limit comes back.`
              : `Cancel anytime. You keep VIP until ${longDate(sub.period_end)}, it just won't renew.`}
          </p>
          <div className="mt-6 grid gap-2">
            {sub.cancel_at_period_end ? (
              <Button onClick={() => run(() => supabase.rpc("resume_subscription"), "Subscription resumed. It will renew as usual.", true)} disabled={pending}>
                {pending ? "Resuming…" : "Resume subscription"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    () => supabase.rpc("cancel_subscription"),
                    `Subscription cancelled. VIP stays on until ${longDate(sub.period_end)}.`,
                    true
                  )
                }
                disabled={pending}
              >
                {pending ? "Cancelling…" : "Cancel subscription"}
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </>
      ) : (
        <>
          <h2 id="vip-title" className="mt-3 text-h5 font-bold">Unlimited resuscitation</h2>
          <p className="mt-2 text-body-sm text-muted-foreground">
            Free 10-message triage limit reached? Keep the hemodynamic romance alive.
          </p>

          <fieldset className="mt-4 grid gap-2 sm:grid-cols-3">
            <legend className="sr-only">Choose a plan</legend>
            {PLANS.map((p) => {
              const price = planPrice(country, p);
              const perMonth = price.amount / p.months;
              const selected = plan === p.id;
              return (
                <label
                  key={p.id}
                  className={cn(
                    "relative flex cursor-pointer flex-col rounded-xl border p-4 transition-colors duration-200 hover:bg-accent",
                    selected && "border-primary bg-primary/5 ring-1 ring-primary"
                  )}
                >
                  <input type="radio" name="plan" value={p.id} checked={selected} onChange={() => setPlan(p.id)} className="sr-only" />
                  <span className="text-body-sm font-semibold">{p.label}</span>
                  <span className="mt-1 font-mono text-lead font-semibold tabular-nums">{formatMoney(price.amount, price.currency)}</span>
                  <span className="text-caption text-muted-foreground tabular-nums">
                    {p.months === 1 ? "per month" : `${formatMoney(perMonth, price.currency)} / month`}
                  </span>
                </label>
              );
            })}
          </fieldset>

          <ul className="mt-4 space-y-2">
            {VIP_PERKS.map((perk) => (
              <li key={perk} className="flex gap-2 text-body-sm">
                <CheckCircle weight="fill" className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                {perk}
              </li>
            ))}
          </ul>
          <div className="mt-6 grid gap-2">
            <Button size="lg" onClick={subscribe} disabled={pending}>
              {pending ? "Processing…" : `Subscribe ${PLANS.find((p) => p.id === plan)?.label.toLowerCase()}`}
            </Button>
            <Button variant="ghost" onClick={onClose}>Maybe later</Button>
          </div>
          <p className="mt-3 text-caption text-muted-foreground">
            Demo mode: no real payment is taken. Renews automatically until you cancel; cancelling keeps VIP until the period ends.
          </p>
        </>
      )}
    </Modal>
  );
}
