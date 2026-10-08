"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PauseCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/** Shown on every app page while the account is deactivated. */
export function PausedBanner() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const reactivate = () =>
    start(async () => {
      const { error } = await createClient().rpc("set_account_active", { p_active: true });
      if (error) return void toast.error("Could not reactivate. Try again.");
      toast.success("Welcome back to the ward. You're visible again.");
      router.refresh();
    });
  return (
    <div role="status" className="border-b bg-muted/60">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
        <PauseCircle className="size-5 shrink-0 text-muted-foreground" />
        <p className="min-w-0 flex-1 text-body-sm">
          <span className="font-semibold">Your account is paused.</span>{" "}
          <span className="text-muted-foreground">Nobody can see you or message you.</span>
        </p>
        <Button size="sm" onClick={reactivate} disabled={pending}>
          {pending ? "Reactivating…" : "Reactivate"}
        </Button>
      </div>
    </div>
  );
}
