/**
 * Stickers are sent as a normal message body "::sticker:<id>::", so they go
 * through the same rules (Bumble, quota, block) and need no extra column.
 */
export const STICKERS = [
  { id: "stat", emoji: "🚨", caption: "STAT!", tone: "red" },
  { id: "tachy", emoji: "💓", caption: "Tachycardic for you", tone: "rose" },
  { id: "rx-date", emoji: "💊", caption: "Rx: 1 date, PRN", tone: "purple" },
  { id: "coffee", emoji: "☕", caption: "Post-call coffee?", tone: "amber" },
  { id: "clear", emoji: "⚡", caption: "Clear! 200J of love", tone: "amber" },
  { id: "post-call", emoji: "😴", caption: "Post-call. Deceased.", tone: "neutral" },
  { id: "breath", emoji: "🫁", caption: "You take my breath away", tone: "blue" },
  { id: "cortex", emoji: "🧠", caption: "Rent-free in my cortex", tone: "purple" },
  { id: "vitals", emoji: "🩺", caption: "Vitals: in love", tone: "emerald" },
  { id: "scrub-in", emoji: "🥼", caption: "Scrubbing in", tone: "blue" },
  { id: "illegible", emoji: "✍️", caption: "Illegible but sincere", tone: "neutral" },
  { id: "code-pink", emoji: "💘", caption: "Code Pink", tone: "rose" },
] as const;

export type Sticker = (typeof STICKERS)[number];

const RE = /^::sticker:([a-z-]+)::$/;

export const stickerBody = (id: string) => `::sticker:${id}::`;

export function parseSticker(body: string | null | undefined): Sticker | null {
  const m = body?.match(RE);
  return m ? (STICKERS.find((s) => s.id === m[1]) ?? null) : null;
}

/** Inbox / notification preview text for a message body. */
export function previewText(body: string | null | undefined) {
  const s = parseSticker(body);
  return s ? `Sticker: ${s.caption}` : (body ?? "");
}

export const EMOJI_GROUPS = [
  { label: "Smileys", items: ["😀", "😄", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😜", "🤪", "🤗", "🤭", "🤔", "😏", "😌", "😴", "🥱", "😮‍💨", "🥹", "😳", "🙈", "😎", "🤓", "🫡"] },
  { label: "Love", items: ["❤️", "🩷", "🧡", "💛", "💚", "💙", "💜", "🤍", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "😻", "💋", "🌹", "💐", "🥂"] },
  { label: "Hospital", items: ["🩺", "💉", "💊", "🩹", "🩻", "🫀", "🫁", "🧠", "🦷", "🦴", "👁️", "🧬", "🦠", "🧪", "🔬", "🏥", "🚑", "🥼", "😷", "🤒", "🤕", "🧑‍⚕️", "👩‍⚕️", "👨‍⚕️"] },
  { label: "Date", items: ["☕", "🍵", "🧋", "🍜", "🍣", "🍕", "🍰", "🍫", "🍷", "🌙", "✨", "🎉", "📅", "⏰", "📍", "🚗", "🎬", "🎶", "👍", "🙏", "👏", "🤝", "💪", "🔥"] },
] as const;

/**
 * Spots messages that look like personal data, so we can ask "send anyway?".
 * Purely client-side and best-effort: it never blocks, it only warns.
 */
export function detectPersonalInfo(text: string): string[] {
  const found = new Set<string>();
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(text)) found.add("an email address");
  const digitRuns = text.match(/\+?\d[\d\s.-]{7,}\d/g) ?? [];
  for (const run of digitRuns) {
    const digits = run.replace(/\D/g, "");
    if (digits.length === 16) found.add("an ID number (NIK) or card number");
    else if (/^(62|0)8\d{7,11}$/.test(digits) || (run.trim().startsWith("+") && digits.length >= 9)) found.add("a phone number");
    else if (digits.length >= 9) found.add("a long number (bank account, card or ID)");
  }
  if (/\b(otp|password|passwd|kata sandi|pin atm|cvv|kode verifikasi)\b/i.test(text)) found.add("a password or verification code");
  if (/\b(no\.?\s?rek|norek|rekening|transfer ke|account number)\b/i.test(text)) found.add("bank details");
  if (/\b(nik|ktp|no\.?\s?str|str number)\b/i.test(text)) found.add("an ID or license number");
  if (/\b(wa|whatsapp|line|telegram|tele)\b/i.test(text) && /\d{4,}|wa\.me|t\.me/i.test(text)) found.add("a WhatsApp or Telegram contact");
  if (/\b(kirim uang|pinjam uang|pinjem|transfer|tf|bayar|payment|pay me|crypto|bitcoin|usdt|invest(asi|ment)?|gift ?card|pulsa|ovo|gopay|dana|shopeepay|western union)\b/i.test(text))
    found.add("a money or payment request");
  return [...found];
}

/** Mirrors the database mask so the composer can say what will be hidden. */
export function willMaskNumbers(text: string) {
  return /(wa\.me|t\.me|whatsapp\.com)\//i.test(text) || (text.match(/\+?\d[\d\s().-]{7,}\d/g) ?? []).some((r) => r.replace(/\D/g, "").length >= 9);
}
