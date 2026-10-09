"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  "password=updated": "Password updated. New key, same doctor.",
};

/** One-off success messages passed through the URL after a redirect (e.g. ?password=updated). */
export function FlashToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const hit = Object.keys(MESSAGES).find((k) => {
      const [key, value] = k.split("=");
      return params.get(key) === value;
    });
    if (!hit) return;
    toast.success(MESSAGES[hit]);
    const next = new URLSearchParams(params);
    next.delete(hit.split("=")[0]);
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [params, pathname, router]);
  return null;
}
