"use client";

import { useEffect, useRef, useState } from "react";
import { StickerView } from "@/components/sticker";
import PillTabs from "@/components/ui/pill-tabs";
import { EMOJI_GROUPS, STICKERS } from "@/lib/stickers";

const TABS = ["Emoji", "Stickers"] as const;

/** Popover above the chat input: emoji grid (inserts) and stickers (sends). */
export function EmojiStickerPicker({
  onEmoji,
  onSticker,
  onClose,
}: {
  onEmoji: (emoji: string) => void;
  onSticker: (id: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<string>("Emoji");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Emoji and stickers"
      className="absolute bottom-full left-0 z-40 mb-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-popover p-3 text-popover-foreground shadow-sm"
    >
      <PillTabs tabs={TABS} value={tab} onChange={setTab} className="md:w-full [&>button]:flex-1" />
      <div className="mt-3 max-h-64 overflow-y-auto pr-1">
        {tab === "Emoji" ? (
          EMOJI_GROUPS.map((g) => (
            <section key={g.label} className="mb-3">
              <p className="mb-1 text-overline font-semibold uppercase text-muted-foreground">{g.label}</p>
              <div className="grid grid-cols-8 gap-1">
                {g.items.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => onEmoji(e)}
                    aria-label={`Insert ${e}`}
                    className="grid aspect-square place-items-center rounded-md text-lead transition-colors duration-200 hover:bg-accent"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {STICKERS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSticker(s.id)}
                className="rounded-2xl transition-transform duration-200 hover:scale-105 active:scale-95"
                aria-label={`Send sticker: ${s.caption}`}
              >
                <StickerView sticker={s} size="sm" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
