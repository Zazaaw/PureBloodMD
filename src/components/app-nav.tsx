"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Cards, ChatCircleDots, ClipboardText, Crown, IdentificationCard, Moon, Sun } from "@phosphor-icons/react";
import { DoctorPhoto } from "@/components/doctor-photo";
import { LogoMark } from "@/components/logo";
import { Dock, DockIcon } from "@/components/magicui/dock";
import { VipDialog } from "@/components/vip-dialog";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/discover", label: "Triage", icon: Cards },
  { href: "/emr", label: "EMR", icon: ClipboardText },
  { href: "/chat", label: "Consults", icon: ChatCircleDots },
  { href: "/passport", label: "Passport", icon: IdentificationCard },
] as const;

type Props = {
  country: string;
  name: string;
  photo: string;
  isVip: boolean;
  /** VIP program switch (app_config). Off during launch: no crown, no plans dialog. */
  vipEnabled: boolean;
  consults: number;
};

/** Hover label for the vertical desktop dock. */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-caption font-medium text-popover-foreground opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 lg:block">
      {children}
    </span>
  );
}

/** Active marker: a small dot like macOS, beside (desktop) or under (phone) the icon. */
function ActiveDot({ vertical }: { vertical: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("absolute size-1 rounded-full bg-foreground", vertical ? "-left-1.5 top-1/2 -translate-y-1/2" : "-bottom-1.5 left-1/2 -translate-x-1/2")}
    />
  );
}

/**
 * Main navigation as a Magic UI dock: a vertical rail with magnification on
 * desktop, a floating bottom dock on phones (hidden inside a chat room so the
 * composer gets the full height).
 */
export function AppNav({ country, name, photo, isVip, vipEnabled, consults }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [vipOpen, setVipOpen] = useState(false);
  const inRoom = /^\/chat\/[^/]+/.test(pathname);

  const renderDock = (vertical: boolean) => (
    <Dock
      orientation={vertical ? "vertical" : "horizontal"}
      iconSize={vertical ? 44 : 42}
      iconMagnification={vertical ? 64 : 42}
      iconDistance={120}
      disableMagnification={!vertical}
      className={vertical ? "gap-2.5 px-2 py-3" : "gap-1.5 px-2.5 py-2"}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <DockIcon key={href} className={cn("group transition-colors duration-200", active ? "bg-secondary" : "hover:bg-accent")}>
            <Link
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className="absolute inset-0 grid place-items-center rounded-full"
            >
              <Icon weight={active ? "fill" : "regular"} className={cn("size-[45%]", active ? "text-foreground" : "text-muted-foreground")} />
            </Link>
            {href === "/chat" && consults > 0 ? (
              <span className="pointer-events-none absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-caption font-semibold leading-4 text-primary-foreground tabular-nums">
                {consults > 99 ? "99+" : consults}
              </span>
            ) : null}
            {active ? <ActiveDot vertical={vertical} /> : null}
            {vertical ? <Tip>{label}</Tip> : null}
          </DockIcon>
        );
      })}

      <span aria-hidden className={vertical ? "my-0.5 h-px w-8 bg-border" : "mx-0.5 h-8 w-px bg-border"} />

      {vipEnabled ? (
      <DockIcon className="group hover:bg-accent">
        <button
          type="button"
          onClick={() => setVipOpen(true)}
          aria-label={isVip ? "VIP subscription" : "See VIP plans"}
          className={cn("absolute inset-0 grid place-items-center rounded-full", isVip ? "text-amber-500" : "text-muted-foreground")}
        >
          <Crown weight={isVip ? "fill" : "regular"} className="size-[45%]" />
        </button>
        {vertical ? <Tip>{isVip ? "VIP subscription" : "VIP plans"}</Tip> : null}
      </DockIcon>
      ) : null}

      <DockIcon className="group hover:bg-accent">
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle dark mode"
          className="absolute inset-0 grid place-items-center rounded-full text-muted-foreground"
        >
          <Sun className="size-[45%] dark:hidden" />
          <Moon className="hidden size-[45%] dark:block" />
        </button>
        {vertical ? <Tip>Theme</Tip> : null}
      </DockIcon>

      {vertical ? (
        <DockIcon className="group">
          <Link href="/passport" aria-label={`${name}'s passport`} className="absolute inset-0 rounded-full">
            <span className="relative block size-full">
              <DoctorPhoto src={photo} alt="" size={64} className="size-full ring-2 ring-border" />
              <span aria-hidden className="absolute bottom-0 right-0 size-[28%] rounded-full bg-emerald-500 ring-2 ring-background" />
            </span>
          </Link>
          <Tip>You are online</Tip>
        </DockIcon>
      ) : null}
    </Dock>
  );

  return (
    <>
      {/* Desktop: brand + vertical dock */}
      <div className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center py-5 lg:flex">
        <Link href="/discover" aria-label="PureBloodMD home" className="grid size-11 place-items-center rounded-xl border bg-card text-foreground">
          <LogoMark className="size-7" />
        </Link>
        <nav aria-label="Main" className="my-auto">
          {renderDock(true)}
        </nav>
      </div>

      {/* Phone: floating bottom dock */}
      <nav
        aria-label="Main"
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden",
          inRoom && "hidden"
        )}
      >
        {renderDock(false)}
      </nav>

      {vipEnabled ? <VipDialog open={vipOpen} country={country} onClose={() => setVipOpen(false)} onChange={() => router.refresh()} /> : null}
    </>
  );
}
