"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Crown } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { VipDialog } from "@/components/vip-dialog";

/** Passport button: see plans when free, manage (cancel / resume) when subscribed. */
export function VipToggle({ isVip, country }: { isVip: boolean; country: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={isVip ? "outline" : "default"} className="w-full" onClick={() => setOpen(true)}>
        <Crown weight={isVip ? "regular" : "fill"} /> {isVip ? "Manage subscription" : "See VIP plans"}
      </Button>
      <VipDialog open={open} country={country} onClose={() => setOpen(false)} onChange={() => router.refresh()} />
    </>
  );
}
