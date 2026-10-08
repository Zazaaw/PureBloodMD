"use client";

import Link from "next/link";
import { useActionState, useCallback, useState } from "react";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthState } from "./actions";

type Props = {
  mode: "login" | "signup";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  /** Show the CAPTCHA on this form. Sign-up always; sign-in only when Supabase enforces it. */
  captcha: boolean;
};

export function AuthForm({ mode, action, captcha }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [token, setToken] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [adult, setAdult] = useState(false);
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

  const blocked = (captcha && !token) || (!isLogin && (!agree || !adult));

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-2">
        <label htmlFor="email" className="text-body-sm font-medium">Email</label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="dr.you@hospital.id" defaultValue={state.email} />
      </div>
      <div className="grid gap-2">
        <label htmlFor="password" className="text-body-sm font-medium">Password</label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={8}
        />
        {!isLogin ? <p className="text-caption text-muted-foreground">At least 8 characters. Unlike your handwriting, make it strong.</p> : null}
      </div>

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
