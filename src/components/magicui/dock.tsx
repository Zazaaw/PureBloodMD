"use client";

/**
 * Dock, adapted from Magic UI (https://magicui.design/docs/components/dock, MIT).
 * PureBloodMD changes, everything else is the original:
 *  - `orientation="vertical"` for the desktop rail (magnifies along Y)
 *  - pointer position from clientX/clientY (matches getBoundingClientRect)
 *  - magnification is skipped on touch / reduced motion (no hover there)
 *  - base classes use the kit's tokens instead of white/black tints
 */
import React, { useRef, type PropsWithChildren } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, MotionValue, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { MotionProps } from "motion/react";

import { cn } from "@/lib/utils";

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string;
  iconSize?: number;
  iconMagnification?: number;
  disableMagnification?: boolean;
  iconDistance?: number;
  direction?: "top" | "middle" | "bottom";
  orientation?: "horizontal" | "vertical";
  children: React.ReactNode;
}

const DEFAULT_SIZE = 40;
const DEFAULT_MAGNIFICATION = 60;
const DEFAULT_DISTANCE = 140;
const DEFAULT_DISABLEMAGNIFICATION = false;

const dockVariants = cva(
  "flex items-center justify-center gap-2 rounded-2xl border bg-background/70 p-2 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
);

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      iconSize = DEFAULT_SIZE,
      iconMagnification = DEFAULT_MAGNIFICATION,
      disableMagnification = DEFAULT_DISABLEMAGNIFICATION,
      iconDistance = DEFAULT_DISTANCE,
      direction = "middle",
      orientation = "horizontal",
      ...props
    },
    ref
  ) => {
    const pointer = useMotionValue(Infinity);
    const reduce = useReducedMotion();
    const vertical = orientation === "vertical";

    const renderChildren = () =>
      React.Children.map(children, (child) => {
        if (React.isValidElement<DockIconProps>(child) && child.type === DockIcon) {
          return React.cloneElement(child, {
            ...child.props,
            pointer,
            vertical,
            size: iconSize,
            magnification: iconMagnification,
            disableMagnification: disableMagnification || !!reduce,
            distance: iconDistance,
          });
        }
        return child;
      });

    return (
      <motion.div
        ref={ref}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") pointer.set(vertical ? e.clientY : e.clientX);
        }}
        onPointerLeave={() => pointer.set(Infinity)}
        {...props}
        className={cn(dockVariants({ className }), vertical ? "w-max flex-col" : "h-max w-max", {
          "items-start": direction === "top",
          "items-center": direction === "middle",
          "items-end": direction === "bottom",
        })}
      >
        {renderChildren()}
      </motion.div>
    );
  }
);

Dock.displayName = "Dock";

export interface DockIconProps extends Omit<MotionProps & React.HTMLAttributes<HTMLDivElement>, "children"> {
  size?: number;
  magnification?: number;
  disableMagnification?: boolean;
  distance?: number;
  pointer?: MotionValue<number>;
  vertical?: boolean;
  className?: string;
  children?: React.ReactNode;
  props?: PropsWithChildren;
}

const DockIcon = ({
  size = DEFAULT_SIZE,
  magnification = DEFAULT_MAGNIFICATION,
  disableMagnification,
  distance = DEFAULT_DISTANCE,
  pointer,
  vertical,
  className,
  children,
  ...props
}: DockIconProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const padding = Math.max(6, size * 0.2);
  const defaultPointer = useMotionValue(Infinity);

  const distanceCalc = useTransform(pointer ?? defaultPointer, (val: number) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, y: 0, width: 0, height: 0 };
    return vertical ? val - b.y - b.height / 2 : val - b.x - b.width / 2;
  });

  const targetSize = disableMagnification ? size : magnification;
  const sizeTransform = useTransform(distanceCalc, [-distance, 0, distance], [size, targetSize, size]);
  const scaleSize = useSpring(sizeTransform, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <motion.div
      ref={ref}
      style={{ width: scaleSize, height: scaleSize, padding }}
      className={cn("relative flex aspect-square cursor-pointer items-center justify-center rounded-full", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

DockIcon.displayName = "DockIcon";

export { Dock, DockIcon, dockVariants };
