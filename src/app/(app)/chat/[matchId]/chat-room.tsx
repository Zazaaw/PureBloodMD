"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChatCircleSlash, Crown, DotsThreeVertical, Flag, HeartBreak, ImageSquare, LockSimple, PaperPlaneRight, Prohibit, SealCheck, ShieldWarning, Smiley, Heartbeat } from "@phosphor-icons/react";
import { toast } from "sonner";
import { ChatImage } from "@/components/chat-image";
import { EmojiStickerPicker } from "@/components/emoji-sticker-picker";
import { StickerView } from "@/components/sticker";
import { DoctorPhoto } from "@/components/doctor-photo";
import { OnlineDot, useIsOnline } from "@/components/presence";
import { SafetyDialog } from "@/components/safety-dialog";
import { Modal } from "@/components/modal";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VipDialog } from "@/components/vip-dialog";
import { ASYSTOLE_HOURS, CONSULT_DORMANT_DAYS, FREE_BUBBLE_CAP, QUICK_FLIRTS } from "@/lib/constants";
import { sounds } from "@/lib/sounds";
import { detectPersonalInfo, parseSticker, stickerBody, willMaskNumbers } from "@/lib/stickers";
import { createClient } from "@/lib/supabase/client";
import type { Gender, InboxRow, Message } from "@/lib/types";
import { prepareImage } from "@/lib/image";
import { cn } from "@/lib/utils";

type Me = { id: string; gender: Gender; isVip: boolean; vipEnabled: boolean; name: string; country: string };

function useCountdown(endsAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, endsAt - now);
  const h = String(Math.floor(left / 3_600_000)).padStart(2, "0");
  const m = String(Math.floor((left % 3_600_000) / 60_000)).padStart(2, "0");
  const s = String(Math.floor((left % 60_000) / 1000)).padStart(2, "0");
  return { label: `${h}:${m}:${s}`, expired: left === 0, left };
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const clock = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export function ChatRoom({ room, me, initialMessages }: { room: InboxRow; me: Me; initialMessages: Message[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isVip, setIsVip] = useState(me.isVip);
  const [vipOpen, setVipOpen] = useState(false);
  const [safety, setSafety] = useState<"report" | "block" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<"clear" | "unmatch" | null>(null);
  const [busy, setBusy] = useState(false);
  // Bubbles are counted on the match (survive "delete chat"), not from the visible list.
  const [bubbles, setBubbles] = useState(room.bubble_count);
  const bubblesRef = useRef(room.bubble_count);
  const seen = useRef(new Set(initialMessages.map((m) => m.id)));
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pii, setPii] = useState<{ text: string; kinds: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const online = useIsOnline(room.other_id, room.other_is_bot);
  // Asystole: only until the first message. Nobody writes within 24 hours of the match
  // and the consult flatlines; once anyone has written, the timer is gone (30 days of silence ends it).
  const countdown = useCountdown(new Date(room.matched_at).getTime() + ASYSTOLE_HOURS * 3_600_000);
  const [flatlinedByServer, setFlatlinedByServer] = useState(false);
  const inAsystole = bubbles === 0;
  const flatlined = (inAsystole && countdown.expired) || flatlinedByServer;

  // Bumble protocol: in a female x male match, the female doctor opens.
  const mustWait = bubbles === 0 && me.gender === "male" && room.other_gender === "female";
  const herMove = bubbles === 0 && me.gender === "female" && room.other_gender === "male";
  const used = bubbles;
  // The 10-bubble cap only exists while the VIP program is switched on.
  const capped = me.vipEnabled && !isVip;
  const quotaGone = capped && used >= FREE_BUBBLE_CAP;
  const locked = mustWait || quotaGone || flatlined;

  const firstName = useMemo(() => room.other_name.replace(/^dr\.\s*/i, "").split(/[ ,]/)[0], [room.other_name]);

  const addMessage = (msg: Message) => {
    if (seen.current.has(msg.id)) return;
    seen.current.add(msg.id);
    setMessages((list) => [...list, msg]);
    bubblesRef.current += 1;
    setBubbles(bubblesRef.current);
  };

  // Live messages for this match, plus "chat cleared" / "unmatched" from the other side.
  useEffect(() => {
    const channel = supabase
      .channel(`match:${room.match_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${room.match_id}` },
        (payload) => {
          const msg = payload.new as Message;
          addMessage(msg);
          if (msg.sender_id !== me.id) {
            setTyping(false);
            sounds.message();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${room.match_id}` },
        async (payload) => {
          // Same bubble count but the match was touched: the history was cleared.
          if ((payload.new as { bubble_count: number }).bubble_count <= bubblesRef.current) {
            const { data } = await supabase
              .from("messages")
              .select("*")
              .eq("match_id", room.match_id)
              .order("created_at", { ascending: true });
            const list = (data ?? []) as Message[];
            seen.current = new Set(list.map((m) => m.id));
            setMessages(list);
          }
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "matches" }, (payload) => {
        if ((payload.old as { id?: string }).id === room.match_id) {
          toast("This consult has ended. If it flatlined, you can meet again in triage.");
          router.push("/chat");
          router.refresh();
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, room.match_id, me.id, router]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  const clearChat = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("clear_chat", { p_match: room.match_id });
    setBusy(false);
    setConfirm(null);
    if (error) return toast.error("Could not delete the chat. Try again.");
    seen.current = new Set();
    setMessages([]);
    toast.success("Chat history deleted for both of you.");
    router.refresh();
  };

  const unmatch = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("unmatch_consult", { p_match: room.match_id });
    setBusy(false);
    setConfirm(null);
    if (error) return toast.error("Could not unmatch. Try again.");
    toast.success(`Unmatched from ${firstName}.`);
    router.push("/chat");
    router.refresh();
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing]);

  useEffect(() => () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, []);

  const send = async (body: string, image?: { path: string; width: number; height: number }) => {
    const clean = body.trim();
    if ((!clean && !image) || sending) return false;
    if (quotaGone) {
      setVipOpen(true);
      return false;
    }
    if (mustWait) {
      toast("Asystole mode: wait for her to initiate CPR first.");
      return false;
    }

    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        match_id: room.match_id,
        sender_id: me.id,
        body: clean,
        image_path: image?.path ?? null,
        image_width: image?.width ?? null,
        image_height: image?.height ?? null,
      })
      .select()
      .single<Message>();
    setSending(false);

    if (error) {
      if (error.message.includes("quota_exhausted")) setVipOpen(true);
      else if (error.message.includes("consult_expired")) setFlatlinedByServer(true);
      else if (error.message.includes("account_paused")) toast.error("One of you has paused their account. Messages are on hold.");
      else if (error.message.includes("bumble_wait")) toast("The female doctor makes the first incision. Hang tight.");
      else if (error.message.includes("blocked") || error.code === "23503") toast.error("This consult is closed.");
      else toast.error("Message failed to send. Try again.");
      return false;
    }

    sounds.beep(720);
    setText("");
    addMessage(data);
    if (!image && data.body !== clean && data.body.includes("*")) {
      toast("Phone number hidden for your safety. Keep contact details off PureBloodMD.");
    }
    if (room.other_is_bot) {
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 5000);
    }
    if (capped && used + 1 >= FREE_BUBBLE_CAP) setTimeout(() => setVipOpen(true), 1200);
    return true;
  };

  /** Typed messages get a personal-info check first; it only warns, never blocks. */
  const trySend = (value: string) => {
    const kinds = detectPersonalInfo(value);
    if (kinds.length) setPii({ text: value, kinds });
    else send(value);
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next.slice(0, 1000));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const sendSticker = async (id: string) => {
    setPickerOpen(false);
    const saved = text;
    const ok = await send(stickerBody(id));
    if (ok) setText(saved); // keep whatever was being typed
  };

  const sendPhoto = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return toast.error("Send a JPG, PNG, WebP or GIF.");
    if (file.size > MAX_IMAGE_BYTES) return toast.error("Max 8 MB per photo. This is a chat, not a PACS server.");
    if (quotaGone) return setVipOpen(true);
    if (mustWait) return toast("Asystole mode: wait for her to initiate CPR first.");

    setSending(true);
    try {
      const img = await prepareImage(file);
      const path = `${room.match_id}/${crypto.randomUUID()}.${img.ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, img.blob, { contentType: img.type });
      if (error) throw error;
      setSending(false);
      await send(text, { path, width: img.width, height: img.height });
    } catch {
      setSending(false);
      toast.error("Photo upload failed. Try again.");
    }
  };

  return (
    <div className="h-app pb-safe flex flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0 lg:hidden">
          <Link href="/chat" aria-label="Back to consults"><ArrowLeft /></Link>
        </Button>
        <span className="relative shrink-0">
          <DoctorPhoto src={room.other_photo} fallback={room.other_photo_fallback} alt={room.other_name} size={44} />
          <OnlineDot id={room.other_id} isBot={room.other_is_bot} />
        </span>
        <div className="min-w-0">
          <h1 className="flex items-center gap-1.5 truncate font-bold">
            {room.other_name}
            {room.other_verified ? (
              <SealCheck weight="fill" className="size-4 shrink-0 text-sky-500" aria-label="Verified: ID and medical license checked" />
            ) : null}
          </h1>
          <p className="truncate text-caption text-muted-foreground">
            <span className={online ? "font-semibold text-emerald-500" : undefined}>{online ? "Online" : "Offline"}</span>
            {" · "}
            {room.other_specialty_title}, {room.other_hospital}
          </p>
        </div>
        <div ref={menuRef} className="relative ml-auto shrink-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Consult options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <DotsThreeVertical weight="bold" />
          </Button>
          {menuOpen ? (
            <div role="menu" className="absolute right-0 top-11 z-40 w-56 rounded-xl border bg-popover p-1 text-popover-foreground shadow-sm">
              {[
                { key: "clear", label: "Delete chat", icon: ChatCircleSlash, onClick: () => setConfirm("clear") },
                { key: "unmatch", label: "Unmatch", icon: HeartBreak, onClick: () => setConfirm("unmatch") },
                { key: "report", label: "Report", icon: Flag, onClick: () => setSafety("report"), danger: true },
                { key: "block", label: "Block", icon: Prohibit, onClick: () => setSafety("block"), danger: true },
              ].map(({ key, label, icon: Icon, onClick, danger }) => (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onClick();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body-sm transition-colors duration-200 hover:bg-accent",
                    danger && "text-red-500"
                  )}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
              <p className="border-t px-3 pb-1.5 pt-2 text-caption text-muted-foreground" suppressHydrationWarning>
                {inAsystole
                  ? `Flatlines in ${countdown.label} unless someone texts`
                  : `Auto-deletes after ${CONSULT_DORMANT_DAYS} days without a message`}
              </p>
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2 text-caption">
        {inAsystole || flatlined ? (
          <span
            className="flex items-center gap-2 text-muted-foreground"
            title={`If nobody writes within ${ASYSTOLE_HOURS} hours of the match, the consult flatlines: the chat is deleted and you can meet again in triage.`}
          >
            <Heartbeat className={cn("size-4 shrink-0", !flatlined && "text-primary")} />
            <span className="hidden sm:inline">No message yet. Asystole in</span>
            <span className="sm:hidden">Asystole in</span>
            <span
              className={cn("font-mono font-semibold tabular-nums", countdown.left < 3 * 3_600_000 ? "text-red-500" : "text-foreground")}
              suppressHydrationWarning
            >
              {flatlined ? "flatlined" : countdown.label}
            </span>
          </span>
        ) : (
          <span
            className="flex items-center gap-2 text-muted-foreground"
            title={`The timer is gone. The consult only ends after ${CONSULT_DORMANT_DAYS} days without a message.`}
          >
            <Heartbeat className="size-4 shrink-0 text-emerald-500" />
            <span><span className="font-medium text-foreground">Sinus rhythm.</span><span className="hidden sm:inline"> CPR worked, no more timer.</span></span>
          </span>
        )}
        <span className="flex items-center gap-2">
          <span className="font-mono tabular-nums">
            {capped ? `${Math.min(used, FREE_BUBBLE_CAP)} / ${FREE_BUBBLE_CAP} bubbles` : `${used} ${used === 1 ? "bubble" : "bubbles"}`}
          </span>
          {isVip ? (
            <button type="button" onClick={() => setVipOpen(true)} aria-label="Manage VIP">
              <StatusPill status="pending"><Crown weight="fill" className="size-3" /> VIP</StatusPill>
            </button>
          ) : !capped ? null : quotaGone ? (
            <StatusPill status="cancelled">Depleted</StatusPill>
          ) : used >= FREE_BUBBLE_CAP - 3 ? (
            <StatusPill status="pending">{FREE_BUBBLE_CAP - used} left</StatusPill>
          ) : (
            <StatusPill status="completed">Active</StatusPill>
          )}
        </span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5" aria-live="polite">
        <aside
          aria-label="Safety notice"
          className="mx-auto flex max-w-md gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-caption text-amber-800 dark:text-amber-300"
        >
          <ShieldWarning weight="fill" className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>Keep it safe.</strong> Don&apos;t share your WhatsApp, phone number, address, NIK or bank details; phone numbers are hidden automatically.
            Never send money or make any transaction through PureBloodMD. We are not responsible for any transaction or personal information you share.
          </p>
        </aside>

        {messages.length === 0 && bubbles > 0 ? (
          <p className="text-center text-caption text-muted-foreground">Chat history deleted. Bubbles used so far still count.</p>
        ) : null}
        {messages.length === 0 && bubbles === 0 ? (
          <div className="mx-auto max-w-sm rounded-xl border p-5 text-center">
            <p className="font-semibold">New resuscitation match with {firstName}</p>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {mustWait
                ? `Asystole mode. ${firstName} has to initiate CPR (send the first text) before you can respond.`
                : herMove
                  ? "Your move, Doctor. You make the first incision."
                  : "No protocol restrictions here. Say something clinically flirty."}
            </p>
          </div>
        ) : null}

        {messages.map((m) => {
          const mine = m.sender_id === me.id;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              {m.image_path ? (
                <ChatImage path={m.image_path} width={m.image_width} height={m.image_height} mine={mine} />
              ) : null}
              {parseSticker(m.body) ? (
                <StickerView sticker={parseSticker(m.body)!} className={mine ? "rotate-2" : undefined} />
              ) : m.body ? (
                <p
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-body-sm",
                    m.image_path && "mt-1",
                    mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card"
                  )}
                >
                  {m.body}
                </p>
              ) : null}
              <span className="mt-1 text-caption text-muted-foreground tabular-nums" suppressHydrationWarning>{clock(m.created_at)}</span>
            </div>
          );
        })}

        {typing ? (
          <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border bg-card px-4 py-3 w-fit" aria-label={`${firstName} is typing`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        ) : null}

        {quotaGone ? (
          <div className="mx-auto max-w-sm rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 text-center">
            <p className="font-semibold">Prescription quota depleted ({FREE_BUBBLE_CAP}/{FREE_BUBBLE_CAP} bubbles)</p>
            <p className="mt-1 text-body-sm text-muted-foreground">
              You have reached the free consult limit with {room.other_name}. Upgrade to PureBlood VIP to unlock unlimited messaging and hospital privileges.
            </p>
            <Button className="mt-4" onClick={() => setVipOpen(true)}>
              <Crown weight="fill" /> See VIP plans
            </Button>
          </div>
        ) : null}
      </div>

      {!locked ? (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {QUICK_FLIRTS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => send(f.text)}
              disabled={sending}
              className="shrink-0 rounded-full border px-3 py-1.5 text-caption font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-foreground"
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {flatlined ? (
        <div role="status" className="flex flex-wrap items-center gap-3 border-t bg-muted/40 px-4 py-3 text-body-sm">
          <Heartbeat className="size-5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <strong>Flatlined.</strong> 24 hours without a message, so this consult is closing. {firstName} can show up in your triage again for a second chance.
          </span>
          <Button size="sm" variant="outline" onClick={() => { router.push("/chat"); router.refresh(); }}>Back to consults</Button>
        </div>
      ) : mustWait ? (
        <p className="flex items-center gap-2 border-t bg-muted/40 px-4 py-3 text-body-sm">
          <LockSimple className="size-4 shrink-0" />
          <span><strong>Waiting for CPR:</strong> {firstName} makes the first incision. If nobody writes within 24 hours, the consult flatlines.</span>
        </p>
      ) : null}

      {willMaskNumbers(text) ? (
        <p role="status" className="flex items-center gap-1.5 border-t bg-amber-500/10 px-4 py-2 text-caption text-amber-800 dark:text-amber-300">
          <ShieldWarning className="size-4 shrink-0" /> Phone numbers and chat-app links will be sent as ****** for your safety.
        </p>
      ) : null}

      <form
        className="relative flex gap-2 border-t px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          trySend(text);
        }}
      >
        {pickerOpen ? (
          <EmojiStickerPicker onEmoji={insertEmoji} onSticker={sendSticker} onClose={() => setPickerOpen(false)} />
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          aria-label="Choose a photo"
          onChange={(e) => sendPhoto(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Send a photo"
          title="Send a photo"
          className="shrink-0"
          disabled={locked || sending}
          onClick={() => fileRef.current?.click()}
        >
          <ImageSquare />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Emoji and stickers"
          aria-expanded={pickerOpen}
          className="shrink-0"
          title="Emoji and stickers"
          disabled={locked || sending}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setPickerOpen((o) => !o)}
        >
          <Smiley />
        </Button>
        <label htmlFor="chat-input" className="sr-only">Message</label>
        <Input
          ref={inputRef}
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          disabled={locked}
          autoComplete="off"
          placeholder={
            quotaGone ? "Quota locked. Upgrade to VIP to keep chatting." : mustWait ? "Waiting for the first incision…" : "Write a clinical diagnosis or flirty consult…"
          }
        />
        <Button type="submit" disabled={locked || sending || !text.trim()} aria-label="Send" className="shrink-0">
          <PaperPlaneRight weight="fill" /> <span className="hidden sm:inline">Send</span>
        </Button>
      </form>

      <Modal open={pii !== null} onClose={() => setPii(null)} labelledBy="pii-title">
        <ShieldWarning className="size-8 text-amber-500" />
        <h2 id="pii-title" className="mt-3 text-lead font-bold">Wait, Doctor</h2>
        <p className="mt-2 text-body-sm text-muted-foreground">
          This message looks like it contains {pii?.kinds.join(", ")}. Scammers and stalkers ask for exactly this.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-body-sm text-muted-foreground">
          <li>Phone numbers and WhatsApp links are hidden automatically when you send.</li>
          <li>Never send or request money, transfers, e-wallet top-ups or crypto here.</li>
          <li>PureBloodMD is not responsible for any transaction or personal information you share.</li>
        </ul>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => setPii(null)}>Edit message</Button>
          <Button
            variant="ghost"
            onClick={() => {
              const value = pii?.text ?? "";
              setPii(null);
              send(value);
            }}
          >
            Send (numbers hidden)
          </Button>
        </div>
      </Modal>

      <SafetyDialog
        open={safety !== null}
        mode={safety ?? "report"}
        matchId={room.match_id}
        target={{ id: room.other_id, name: room.other_name.split(",")[0] }}
        onClose={() => setSafety(null)}
        onBlocked={() => {
          router.push("/chat");
          router.refresh();
        }}
      />

      <Modal open={confirm !== null} onClose={() => setConfirm(null)} labelledBy="confirm-title">
        {confirm === "clear" ? (
          <>
            <ChatCircleSlash className="size-8 text-muted-foreground" />
            <h2 id="confirm-title" className="mt-3 text-lead font-bold">Delete this chat?</h2>
            <p className="mt-2 text-body-sm text-muted-foreground">
              All messages and photos in this consult are deleted for both you and {firstName}. You stay matched.
              Bubbles already used still count toward the free limit.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button variant="destructive" onClick={clearChat} disabled={busy}>{busy ? "Deleting…" : "Delete chat"}</Button>
              <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            </div>
          </>
        ) : (
          <>
            <HeartBreak className="size-8 text-muted-foreground" />
            <h2 id="confirm-title" className="mt-3 text-lead font-bold">Unmatch {firstName}?</h2>
            <p className="mt-2 text-body-sm text-muted-foreground">
              The consult and every message disappear for both of you, and you won&apos;t be shown to each other in triage again.
              This can&apos;t be undone.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button variant="destructive" onClick={unmatch} disabled={busy}>{busy ? "Unmatching…" : "Unmatch"}</Button>
              <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            </div>
          </>
        )}
      </Modal>

      <VipDialog
        open={vipOpen}
        country={me.country}
        onClose={() => setVipOpen(false)}
        onChange={(v) => {
          setIsVip(v);
          router.refresh();
        }}
      />
    </div>
  );
}
