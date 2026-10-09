"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Flag, Prohibit } from "@phosphor-icons/react";
import { SafetyDialog } from "@/components/safety-dialog";
import { Button } from "@/components/ui/button";

/** Report and Block from someone's profile. Blocking hides them everywhere, so we leave the page. */
export function ProfileActions({ target }: { target: { id: string; name: string } }) {
  const router = useRouter();
  const [mode, setMode] = useState<"report" | "block" | null>(null);
  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setMode("report")} aria-label={`Report ${target.name}`}>
        <Flag />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setMode("block")} aria-label={`Block ${target.name}`}>
        <Prohibit />
      </Button>
      <SafetyDialog
        open={mode !== null}
        onClose={() => setMode(null)}
        target={target}
        mode={mode ?? "report"}
        onBlocked={() => router.push("/emr")}
      />
    </>
  );
}
