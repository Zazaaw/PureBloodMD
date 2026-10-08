import { cn } from "@/lib/utils";

/**
 * PureBloodMD mark: two interlocking rings (two doctors, one covenant) with a
 * drop of blood where they meet. The rings truly interlock: the left ring
 * passes in front at the top, the right ring in front at the bottom.
 * Rings follow the text color; only the drop carries the brand rose.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("size-6 shrink-0", className)}
    >
      <defs>
        <mask id="pbmd-under-left">
          <rect width="32" height="32" fill="#fff" />
          <circle cx="16" cy="23.2" r="2.7" fill="#000" />
        </mask>
        <mask id="pbmd-under-right">
          <rect width="32" height="32" fill="#fff" />
          <circle cx="16" cy="8.8" r="2.7" fill="#000" />
        </mask>
      </defs>
      <circle cx="12.4" cy="16" r="8" stroke="currentColor" strokeWidth="2.3" mask="url(#pbmd-under-left)" />
      <circle cx="19.6" cy="16" r="8" stroke="currentColor" strokeWidth="2.3" mask="url(#pbmd-under-right)" />
      <path d="M16 11.2c0 0-2.6 3.1-2.6 5.1a2.6 2.6 0 0 0 5.2 0c0-2-2.6-5.1-2.6-5.1z" className="fill-primary" />
    </svg>
  );
}

/** Mark + wordmark. "MD" sits as a small tracked suffix, like a post-nominal. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold tracking-tight", className)}>
      <LogoMark className={cn("size-9 -my-1", markClassName)} />
      <span>
        PureBlood
        <span className="ml-1 align-[0.15em] text-overline font-bold uppercase text-muted-foreground">MD</span>
      </span>
    </span>
  );
}
