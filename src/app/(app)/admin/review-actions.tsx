"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Textarea } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const QUICK_NOTES = [
  "The ID photo is blurry or cut off. Please send a clear photo of the whole card.",
  "Your face isn't clearly visible next to the ID in the selfie.",
  "The name on the license doesn't match your ID.",
  "We need a valid STR/SIP (or a student card for medical students).",
];

export function ReviewActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const review = (approve: boolean) =>
    start(async () => {
      const { error } = await createClient().rpc("admin_review_verification", { p_id: id, p_approve: approve, p_note: approve ? null : note });
      if (error) {
        toast.error(error.message.includes("note_required") ? "Write a note so they know what to fix." : "Could not save the review. Refresh and try again.");
        return;
      }
      toast.success(approve ? `${name} is verified. Congrats email sent.` : `Sent back to ${name} with your note.`);
      router.refresh();
    });

  if (rejecting) {
    return (
      <div className="space-y-3 rounded-lg border p-3">
        <label htmlFor={`note-${id}`} className="text-body-sm font-medium">What should they fix? (sent in the email)</label>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_NOTES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNote(n)}
              className="rounded-full border px-2.5 py-1 text-left text-caption text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {n}
            </button>
          ))}
        </div>
        <Textarea id={`note-${id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Be specific and kind." />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setRejecting(false)} disabled={pending}>Cancel</Button>
          <Button variant="destructive" onClick={() => review(false)} disabled={pending || !note.trim()}>
            {pending ? "Sending…" : "Reject and email"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" onClick={() => setRejecting(true)} disabled={pending}>
        <XCircle /> Needs another look
      </Button>
      <Button onClick={() => review(true)} disabled={pending}>
        <CheckCircle /> {pending ? "Approving…" : "Approve and verify"}
      </Button>
    </div>
  );
}
