import type { Sticker } from "@/lib/stickers";
import { cn } from "@/lib/utils";

const tones: Record<Sticker["tone"], string> = {
  red: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
  rose: "bg-primary/10 border-primary/20 text-primary",
  purple: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  amber: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400",
  neutral: "bg-neutral-500/10 border-neutral-500/20 text-neutral-600 dark:text-neutral-300",
  blue: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
};

/** A sticker: big emoji on a tinted die-cut card with a caption. */
export function StickerView({ sticker, size = "md", className }: { sticker: Sticker; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`Sticker: ${sticker.caption}`}
      className={cn(
        "inline-flex flex-col items-center justify-center gap-1 rounded-2xl border-2 text-center shadow-sm",
        size === "md" ? "w-32 -rotate-2 p-3" : "w-full p-2",
        tones[sticker.tone],
        className
      )}
    >
      <span className={size === "md" ? "text-h3 leading-none" : "text-h5 leading-none"} aria-hidden>{sticker.emoji}</span>
      <span className={cn("font-bold leading-tight", "text-caption")}>{sticker.caption}</span>
    </span>
  );
}
