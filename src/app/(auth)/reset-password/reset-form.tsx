"use client";

import { useActionState, useState } from "react";
import { PasswordInput } from "@/components/form/password-input";
import { HeartbeatLoader } from "@/components/heartbeat-loader";
import { Button } from "@/components/ui/button";
import { setNewPassword } from "../password-actions";

export function ResetForm() {
  const [state, action, pending] = useActionState(setNewPassword, {});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <form action={action} className="space-y-4" noValidate>
      {pending ? <HeartbeatLoader label="Re-issuing your key…" /> : null}
      <div className="grid gap-2">
        <label htmlFor="password" className="text-body-sm font-medium">New password</label>
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="text-caption text-muted-foreground">At least 8 characters. Unlike your handwriting, make it strong.</p>
      </div>
      <div className="grid gap-2">
        <label htmlFor="password_confirm" className="text-body-sm font-medium">Confirm new password</label>
        <PasswordInput
          id="password_confirm"
          name="password_confirm"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch}
          aria-describedby="password_confirm_hint"
          className={mismatch ? "border-red-500 focus-visible:ring-red-500" : undefined}
        />
        <p id="password_confirm_hint" className={mismatch ? "text-caption text-red-500" : "text-caption text-muted-foreground"} aria-live="polite">
          {mismatch ? "Passwords don't match. Check for a typo." : confirm && confirm === password ? "Passwords match." : "Type it once more."}
        </p>
      </div>
      {state.error ? <p role="alert" className="text-body-sm text-red-500">Error: {state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending || password.length < 8 || confirm !== password}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
