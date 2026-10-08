import { cn } from "@/lib/utils";

/**
 * Skeleton — a pulsing placeholder block.
 *
 * PureBloodMD change: `bg-foreground/10` instead of the kit's `bg-primary/10`,
 * so loading states stay neutral grey instead of tinting with the rose accent.
 * Still theme-derived: light grey on light, dark grey on dark, one class.
 *
 * THE RULE THAT MATTERS: a skeleton must mirror the real layout of the page
 * it stands in for — same number of blocks, same rough sizes, same grid.
 * A generic centered spinner makes the page appear to jump when content
 * lands; a matching skeleton makes it appear to resolve.
 *
 *   // good — mirrors a 2-column card grid
 *   <div className="grid gap-5 sm:grid-cols-2">
 *     {Array.from({ length: 4 }).map((_, i) => (
 *       <Skeleton key={i} className="h-48 rounded-xl" />
 *     ))}
 *   </div>
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-foreground/10", className)}
      {...props}
    />
  );
}

export { Skeleton };
