import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import type { InboxRow, Message } from "@/lib/types";
import { ChatRoom } from "./chat-room";

export const metadata: Metadata = { title: "Consult" };

export default async function ChatRoomPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const { supabase, profile, flags } = await requireProfile();

  const [{ data: inbox }, { data: messages }] = await Promise.all([
    supabase.rpc("get_inbox"),
    supabase.from("messages").select("*").eq("match_id", matchId).order("created_at", { ascending: true }),
  ]);
  const room = ((inbox ?? []) as InboxRow[]).find((r) => r.match_id === matchId);
  if (!room) notFound();

  return (
    <ChatRoom
      key={matchId}
      room={room}
      me={{ id: profile.id, gender: profile.gender, isVip: profile.is_vip, vipEnabled: flags.vipEnabled, name: profile.display_name, country: profile.country ?? "ID" }}
      initialMessages={(messages ?? []) as Message[]}
    />
  );
}
