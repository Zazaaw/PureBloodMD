"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DoctorPhoto } from "@/components/doctor-photo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { BlockedRow } from "@/lib/types";

export function BlockedList({ rows }: { rows: BlockedRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const unblock = (r: BlockedRow) =>
    start(async () => {
      setBusy(r.profile_id);
      const { error } = await createClient().rpc("unblock_profile", { p_target: r.profile_id });
      setBusy(null);
      if (error) {
        toast.error("Could not unblock. Try again.");
        return;
      }
      toast(`${r.display_name.split(",")[0]} is unblocked.`);
      router.refresh();
    });

  if (!rows.length) {
    return <p className="text-body-sm text-muted-foreground">Nobody blocked. A peaceful ward.</p>;
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.profile_id} className="flex items-center gap-3">
          <DoctorPhoto src={r.photo_url} fallback={r.photo_fallback_url} alt="" size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-sm font-semibold">{r.display_name}</span>
            <span className="block truncate text-caption text-muted-foreground">{r.specialty_title}</span>
          </span>
          <Button variant="outline" size="sm" onClick={() => unblock(r)} disabled={busy === r.profile_id}>
            {busy === r.profile_id ? "…" : "Unblock"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
