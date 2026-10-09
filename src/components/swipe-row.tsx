"use client";

import { useRef, useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const ACTION_W = 88;

/**
 * Swipe a row left to reveal a Delete action (phones), like Mail or WhatsApp.
 * Vertical scrolling stays native (touch-action: pan-y); on desktop the action
 * appears on hover instead.
 */
export function SwipeRow({ children, onDelete, label }: { children: React.ReactNode; onDelete: () => void; label: string }) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; axis: "x" | "y" | null } | null>(null);
  const moved = useRef(false);

  const open = x <= -ACTION_W / 2;

  return (
    <div className="group relative overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={() => {
          setX(0);
          onDelete();
        }}
        aria-label={`Delete consult with ${label}`}
        tabIndex={open ? 0 : -1}
        className="absolute inset-y-0 right-0 flex w-[88px] flex-col items-center justify-center gap-0.5 bg-red-500 text-caption font-semibold text-white"
      >
        <Trash weight="fill" className="size-5" /> Delete
      </button>
      <div
        style={{ transform: `translateX(${x}px)`, transition: dragging ? "none" : "transform 220ms var(--ease-reveal)" }}
        className="relative touch-pan-y bg-background"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          start.current = { x: e.clientX, y: e.clientY, base: x, axis: null };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (!s.axis && Math.hypot(dx, dy) > 8) s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          if (s.axis !== "x") return;
          moved.current = true;
          setDragging(true);
          setX(Math.max(-ACTION_W - 24, Math.min(0, s.base + dx)));
        }}
        onPointerUp={() => {
          if (!start.current) return;
          start.current = null;
          setDragging(false);
          setX((v) => (v <= -ACTION_W / 2 ? -ACTION_W : 0));
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setX(0);
        }}
        onClickCapture={(e) => {
          // A swipe, or a tap while the action is showing, must not open the chat.
          if (moved.current || x !== 0) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
            setX(0);
          }
        }}
      >
        {children}
      </div>
      {/* Desktop: a small trash button on hover. */}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete consult with ${label}`}
        className={cn(
          "absolute right-2 top-1/2 hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-card text-muted-foreground opacity-0 shadow-sm transition-opacity duration-200 hover:text-red-500 group-hover:opacity-100 focus-visible:opacity-100 lg:grid"
        )}
      >
        <Trash className="size-4" />
      </button>
    </div>
  );
}
