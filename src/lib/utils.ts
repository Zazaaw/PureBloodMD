import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The single most-used helper in the whole system.
 *
 * `clsx` handles conditionals and arrays; `twMerge` resolves Tailwind
 * conflicts so a later class actually wins:
 *
 *   cn("px-4 py-2", "px-8")            → "py-2 px-8"     (not both px)
 *   cn("text-sm", isBig && "text-lg")  → "text-lg"        when isBig
 *
 * Without twMerge, `className` overrides passed into a component would fight
 * the component's own defaults instead of replacing them. Every component in
 * this kit accepts a `className` prop and pipes it through cn() last, so
 * callers can always override.
 */
// PureBloodMD: the phi type scale adds custom text-* sizes (globals.css).
// Without registering them, twMerge treats `text-caption` as a COLOR and drops
// it whenever a text color follows (e.g. cn("text-caption", "text-primary")).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["caption", "overline", "body-sm", "body", "lead", "display", "h1", "h2", "h3", "h4", "h5"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
