"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CheckCircle, IdentificationBadge, SealCheck, ShieldCheck, UserFocus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { IMAGE_ACCEPT, MAX_PICK_BYTES, isPickableImage, prepareImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import type { VerificationRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOCS = [
  { key: "id", label: "ID card (KTP or passport)", hint: "Photo of the front, all text readable.", icon: IdentificationBadge },
  { key: "selfie", label: "Selfie holding your ID", hint: "Your face and the ID in one photo.", icon: UserFocus },
  { key: "license", label: "Medical license (STR / SIP)", hint: "Medical students: your student card.", icon: ShieldCheck },
] as const;
type DocKey = (typeof DOCS)[number]["key"];

const MAX_PDF = 8 * 1024 * 1024;
const ACCEPT = `${IMAGE_ACCEPT},application/pdf`;

/**
 * The blue badge = a human checked your ID AND your medical license.
 * Documents go to a private bucket that only reviewers (service role) can read.
 */
export function VerificationCard({
  userId,
  verified,
  latest,
}: {
  userId: string;
  verified: boolean;
  latest: VerificationRequest | null;
}) {
  const router = useRouter();
  const [paths, setPaths] = useState<Partial<Record<DocKey, string>>>({});
  const [busy, setBusy] = useState<DocKey | "submit" | null>(null);
  const inputs = useRef<Partial<Record<DocKey, HTMLInputElement | null>>>({});

  if (verified) {
    return (
      <div className="flex gap-3">
        <SealCheck weight="fill" className="mt-0.5 size-6 shrink-0 text-sky-500" />
        <div>
          <p className="font-semibold">You are verified</p>
          <p className="text-body-sm text-muted-foreground">Your ID and medical license were checked. The blue badge shows on your card.</p>
        </div>
      </div>
    );
  }

  if (latest?.status === "pending") {
    return (
      <div className="space-y-2">
        <StatusPill status="pending">In review</StatusPill>
        <p className="text-body-sm text-muted-foreground">
          A real human is checking your documents, which takes up to 3 days. We emailed you, and we will email again with the result. Your documents are private and deleted after review.
        </p>
      </div>
    );
  }

  const upload = async (key: DocKey, file: File | undefined) => {
    if (!file) return;
    const pdf = file.type === "application/pdf";
    if (!pdf && !isPickableImage(file)) return toast.error("Use a photo or a PDF.");
    if (pdf ? file.size > MAX_PDF : file.size > MAX_PICK_BYTES) return toast.error(pdf ? "Max 8 MB per PDF." : "Max 50 MB per photo.");
    setBusy(key);
    // Photos are shrunk (still sharp enough to read, 2400 px) and stripped of location data.
    let blob: Blob = file;
    let type = file.type;
    let ext = "pdf";
    if (!pdf) {
      try {
        const img = await prepareImage(file, 2400);
        ({ blob, type, ext } = img);
      } catch {
        setBusy(null);
        return toast.error("This photo could not be read. Try a screenshot or a JPG.");
      }
    }
    const path = `${userId}/${key}-${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("verification-docs").upload(path, blob, { contentType: type });
    setBusy(null);
    if (error) return toast.error("Upload failed. Try again.");
    setPaths((p) => ({ ...p, [key]: path }));
  };

  const submit = async () => {
    if (!paths.id || !paths.selfie || !paths.license) return;
    setBusy("submit");
    const { error } = await createClient().rpc("submit_verification", {
      p_id_doc: paths.id,
      p_selfie: paths.selfie,
      p_license: paths.license,
    });
    setBusy(null);
    if (error) {
      toast.error(
        error.message.includes("already_pending")
          ? "You already have a request in review."
          : error.message.includes("Could not find")
            ? "Run supabase/migrations/0005 in the SQL Editor first."
            : "Could not submit. Try again."
      );
      return;
    }
    toast.success("Documents sent. We'll review them soon.");
    router.refresh();
  };

  const ready = Boolean(paths.id && paths.selfie && paths.license);

  return (
    <div className="space-y-4">
      {latest?.status === "rejected" ? (
        <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-body-sm text-red-600 dark:text-red-400">
          Your last request was not approved{latest.reviewer_note ? `: ${latest.reviewer_note}` : "."} Please upload clearer documents.
        </p>
      ) : (
        <p className="text-body-sm text-muted-foreground">
          Get the blue badge by verifying that you are a real person and a real doctor. Verified profiles get more matches.
        </p>
      )}
      <ul className="space-y-2">
        {DOCS.map(({ key, label, hint, icon: Icon }) => {
          const done = Boolean(paths[key]);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => inputs.current[key]?.click()}
                disabled={busy !== null}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors duration-200 hover:bg-accent",
                  done && "border-emerald-500/30 bg-emerald-500/5",
                  busy === key && "animate-pulse"
                )}
              >
                {done ? <CheckCircle weight="fill" className="size-5 shrink-0 text-emerald-500" /> : <Icon className="size-5 shrink-0 text-muted-foreground" />}
                <span className="min-w-0">
                  <span className="block text-body-sm font-medium">{label}</span>
                  <span className="block text-caption text-muted-foreground">{done ? "Uploaded. Tap to replace." : hint}</span>
                </span>
              </button>
              <input
                ref={(el) => {
                  inputs.current[key] = el;
                }}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                aria-label={label}
                onChange={(e) => upload(key, e.target.files?.[0])}
              />
            </li>
          );
        })}
      </ul>
      <Button className="w-full" onClick={submit} disabled={!ready || busy !== null}>
        {busy === "submit" ? "Sending…" : "Submit for review"}
      </Button>
      <p className="text-caption text-muted-foreground">
        Stored privately, seen only by our review team, deleted after the decision. Never send these documents to another member.
      </p>
    </div>
  );
}
