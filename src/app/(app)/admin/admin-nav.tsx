"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartBar, ClipboardText, Flag, GearSix, SealCheck, Users } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: ChartBar },
  { href: "/admin/verification", label: "Verification", icon: SealCheck, count: "verification" },
  { href: "/admin/reports", label: "Reports", icon: Flag, count: "reports" },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/emr", label: "EMR", icon: ClipboardText },
  { href: "/admin/settings", label: "Settings", icon: GearSix },
] as const;

/** Section switcher for the admin dashboard, with live queue counts. */
export function AdminNav({ counts }: { counts: { verification: number; reports: number } }) {
  const pathname = usePathname();
  return (
    <div className="mb-6">
      <p className="mb-2 text-overline font-semibold uppercase text-muted-foreground">PureBloodMD admin</p>
      <nav
        aria-label="Admin sections"
        className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {ITEMS.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const n = "count" in item ? counts[item.count] : 0;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-body-sm font-medium transition-colors duration-200",
                active ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon weight={active ? "fill" : "regular"} className="size-4" />
              {item.label}
              {n ? (
                <span className={cn("min-w-5 rounded-full px-1.5 text-center text-caption font-semibold tabular-nums", active ? "bg-background text-foreground" : "bg-primary text-primary-foreground")}>
                  {n}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
