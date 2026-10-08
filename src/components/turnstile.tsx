"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  return new Promise<void>((resolve, reject) => {
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("turnstile failed to load")));
    if (!existing) {
      s.src = SCRIPT_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

/**
 * Cloudflare Turnstile widget. It adds a hidden `cf-turnstile-response` input
 * to the surrounding form. Remount it (change `key`) after a failed submit:
 * tokens are single-use.
 */
export function Turnstile({ onToken }: { onToken?: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let id: string | null = null;
    let alive = true;
    loadScript()
      .then(() => {
        if (!alive || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: resolvedTheme === "dark" ? "dark" : "light",
          size: "flexible",
          callback: (t: string) => onToken?.(t),
          "expired-callback": () => onToken?.(null),
          "error-callback": () => onToken?.(null),
        });
      })
      .catch(() => onToken?.(null));
    return () => {
      alive = false;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey, resolvedTheme, onToken]);

  if (!siteKey) return null;
  return <div ref={ref} className="min-h-[65px] w-full" aria-label="CAPTCHA" />;
}
