"use client";

import Link from "next/link";
import { useActionState, useCallback, useState } from "react";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { CountrySelect } from "@/components/form/country-select";
import { IntentPicker } from "@/components/form/intent-picker";
import { PasswordInput } from "@/components/form/password-input";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthState } from "./actions";

type Props = {
  mode: "login" | "signup";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  /** Show the CAPTCHA on this form. Sign-up always; sign-in only when Supabase enforces it. */
  captcha: boolean;
  /** Countries open for sign-up (app_config). */
  countries?: string[];
};

export function AuthForm({ mode, action, captcha, countries = ["ID"] }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [token, setToken] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [adult, setAdult] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const onToken = useCallback((t: string | null) => setToken(t), []);
  const isLogin = mode === "login";

  if (state.notice) {
    return (
      <div className="space-y-3 text-center" role="status">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <EnvelopeSimple weight="fill" className="size-6" />
        </span>
        <p className="font-semibold">Check your inbox</p>
        <p className="text-body-sm text-muted-foreground">
          {state.notice} {state.email ? <>It went to <strong className="text-foreground">{state.email}</strong>.</> : null}
        </p>
        <p className="text-caption text-muted-foreground">Not there after a minute? Look in Spam or Promotions.</p>
      </div>
    );
  }

  const mismatch = !isLogin && confirm.length > 0 && confirm !== password;
  const blocked = (captcha && !token) || (!isLogin && (!agree || !adult || mismatch || confirm.length === 0));

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {!isLogin ? <IntentPicker defaultValue={state.intent} /> : null}
      <div className="grid gap-2">
        <label htmlFor="email" className="text-body-sm font-medium">Email</label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="dr.you@hospital.id" defaultValue={state.email} />
      </div>
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="password" className="text-body-sm font-medium">Password</label>
          {isLogin ? (
            <Link href="/forgot-password" className="text-caption font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Forgot password?
            </Link>
          ) : null}
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {!isLogin ? <p className="text-caption text-muted-foreground">At least 8 characters. Unlike your handwriting, make it strong.</p> : null}
      </div>

      {!isLogin ? (
        <>
          <div className="grid gap-2">
            <label htmlFor="password_confirm" className="text-body-sm font-medium">Confirm password</label>
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
              {mismatch ? "Passwords don't match. Check for a typo." : confirm && confirm === password ? "Passwords match." : "Type it once more, no copy-paste diagnosis."}
            </p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="country" className="text-body-sm font-medium">Country</label>
<CountrySelect id="country" countries={countries} defaultValue={state.country} />
            <p className="text-caption text-muted-foreground">
              {countries.length > 1
                ? "Where you practice. It sets your triage deck, and you can change it later in Passport."
                : "We're launching in Indonesia first. More countries once the ward fills up."}
            </p>
          </div>
        </>
      ) : null}

      {!isLogin ? (
        <div className="space-y-2.5 rounded-lg border p-3">
          <label className="flex gap-2.5 text-body-sm">
            <input type="checkbox" name="agree_terms" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 accent-[hsl(var(--primary))]" />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="font-medium underline underline-offset-4">Terms &amp; Conditions</Link> and{" "}
              <Link href="/privacy" target="_blank" className="font-medium underline underline-offset-4">Privacy Policy</Link>.
            </span>
          </label>
          <label className="flex gap-2.5 text-body-sm">
            <input type="checkbox" name="confirm_age" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1 accent-[hsl(var(--primary))]" />
            <span>I am 21 or older. I understand only members with the blue badge have had their ID and medical license checked, and that PureBloodMD is not responsible for any money or personal information I share with other members.</span>
          </label>
        </div>
      ) : null}

      {/* Remount on every result: Turnstile tokens are single-use. */}
      {captcha ? <Turnstile key={JSON.stringify(state)} onToken={onToken} /> : null}

      {state.error ? (
        <p role="alert" className="text-body-sm text-red-500">Error: {state.error}</p>
      ) : null}

      {isLogin && state.unconfirmed ? (
        <Button type="submit" name="intent" value="resend" variant="outline" className="w-full" disabled={pending}>
          <EnvelopeSimple /> Resend confirmation email
        </Button>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending || blocked}>
        {pending ? "Scrubbing in…" : isLogin ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-body-sm text-muted-foreground">
        {isLogin ? "New to the pureblood registry? " : "Already registered? "}
        <Link href={isLogin ? "/signup" : "/login"} className="font-medium text-foreground underline underline-offset-4">
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
