import { requireProfile } from "@/lib/auth";
import type { InboxRow } from "@/lib/types";
import { ChatShell } from "./chat-shell";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireProfile();
  const { data } = await supabase.rpc("get_inbox");
  return (
    <ChatShell meId={profile.id} inbox={(data ?? []) as InboxRow[]}>
      {children}
    </ChatShell>
  );
}
