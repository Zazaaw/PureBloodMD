"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Credentials } from "@/lib/types";
import { updateCredentials } from "./actions";

/** Private credentials: never shown to other doctors, only on your passport. */
export function CredentialsForm({ credentials }: { credentials: Credentials | null }) {
  const [state, action, pending] = useActionState(updateCredentials, {});
  const e = state.errors ?? {};

  useEffect(() => {
    if (state.saved) toast.success("Credentials filed. Nobody else can see them.");
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4">
        <Field id="str_number" label="STR number (NIM for students)" error={e.str_number}>
          <Input id="str_number" name="str_number" className="font-mono uppercase" defaultValue={credentials?.str_number ?? ""} />
        </Field>
        <Field id="alma_mater" label="Alma mater" error={e.alma_mater}>
          <Input id="alma_mater" name="alma_mater" defaultValue={credentials?.alma_mater ?? ""} />
        </Field>
        <Field id="class_year" label="Class of" error={e.class_year}>
          <Input id="class_year" name="class_year" type="number" min={1970} max={2035} className="tabular-nums" defaultValue={credentials?.class_year ?? ""} />
        </Field>
      </div>
      {state.error ? <p className="text-body-sm text-red-500">Error: {state.error}</p> : null}
      <div>
        <Button type="submit" variant="outline" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Save credentials"}
        </Button>
      </div>
    </form>
  );
}
