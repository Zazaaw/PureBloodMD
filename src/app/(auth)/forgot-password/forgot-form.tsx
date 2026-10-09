"use client";

import Link from "next/link";
import { useActionState } from "react";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "../password-actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});

  if (state.notice) {
    return (
      <div className="space-y-3 text-center" role="status">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <EnvelopeSimple weight="fill" className="size-6" />
        </span>
        <p className="font-semibold">Check your inbox</p>
        <p className="text-body-sm text-muted-foreground">{state.notice}</p>
        <p className="text-caption text-muted-foreground">Not there after a minute? Look in Spam or Promotions.</p>
        <Link href="/login" className="inline-block text-body-sm font-medium underline underline-offset-4">Back to sign in</Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-2">
        <label htmlFor="email" className="text-body-sm font-medium">Email</label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="dr.you@hospital.id" defaultValue={state.email} />
      </div>
      {state.error ? <p role="alert" className="text-body-sm text-red-500">Error: {state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-body-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">Sign in</Link>
      </p>
    </form>
  );
}
