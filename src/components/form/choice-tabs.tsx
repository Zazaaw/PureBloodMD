"use client";

import { useState } from "react";
import PillTabs from "@/components/ui/pill-tabs";

/** PillTabs wired to a hidden input so it posts with the form. */
export function ChoiceTabs({
  name,
  options,
  defaultValue,
  onChange,
}: {
  name: string;
  options: readonly { label: string; value: string }[];
  defaultValue: string;
  onChange?: (value: string) => void;
}) {
  // A default that isn't offered (e.g. "Both" after switching to Romance) falls back to the first option.
  const [value, setValue] = useState(options.some((o) => o.value === defaultValue) ? defaultValue : options[0].value);
  const label = options.find((o) => o.value === value)?.label ?? options[0].label;
  return (
    <>
      <PillTabs
        tabs={options.map((o) => o.label)}
        value={label}
        onChange={(l) => {
          const next = options.find((o) => o.label === l)!.value;
          setValue(next);
          onChange?.(next);
        }}
      />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
