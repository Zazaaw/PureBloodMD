"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  fallback?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  size?: number;
};

/**
 * Every doctor has a real face photo. If a remote photo ever breaks, swap to
 * the same-gender backup that was assigned in the seed. Never an empty box.
 *
 * `unoptimized`: the browser loads photos straight from the host. Some
 * networks (NAT64) resolve these IPv4-only hosts to 64:ff9b:: addresses,
 * which the Next.js optimizer rejects as "private IP". The photos are
 * already small (128-600px), so optimizing them gains little.
 */
export function DoctorPhoto({ src, fallback, alt, className, sizes, priority, fill, size = 48 }: Props) {
  const [current, setCurrent] = useState(src);
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setCurrent(src);
  }

  const onError = () => {
    if (fallback && current !== fallback) setCurrent(fallback);
  };

  if (fill) {
    return (
      <Image
        src={current}
        alt={alt}
        fill
        sizes={sizes ?? "(max-width: 768px) 100vw, 480px"}
        priority={priority}
        unoptimized
        onError={onError}
        className={cn("object-cover", className)}
      />
    );
  }
  return (
    <Image
      src={current}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      unoptimized
      onError={onError}
      className={cn("aspect-square rounded-full object-cover", className)}
    />
  );
}
