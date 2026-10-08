"use client";

import { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Password field with a show/hide eye on the right. */
export function PasswordInput({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {visible ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
