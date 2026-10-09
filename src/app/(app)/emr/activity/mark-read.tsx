"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Opening Activity clears the heart badge (here and in the dock). */
export function MarkRead({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!hasUnread) return;
    createClient()
      .rpc("mark_emr_notifications_read")
      .then(() => router.refresh());
  }, [hasUnread, router]);
  return null;
}
