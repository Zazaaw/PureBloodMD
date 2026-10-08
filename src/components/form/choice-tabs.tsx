"use client";

import { useState } from "react";
import PillTabs from "@/components/ui/pill-tabs";

/** PillTabs wired to a hidden input so it posts with the form. */
export function ChoiceTabs({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: readonly { label: string; value: string }[];
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const label = options.find((o) => o.value === value)?.label ?? options[0].label;
  return (
    <>
      <PillTabs
        tabs={options.map((o) => o.label)}
        value={label}
        onChange={(l) => setValue(options.find((o) => o.label === l)!.value)}
      />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
