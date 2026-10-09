"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle, Eye } from "@phosphor-icons/react";
import { toast } from "sonner";
import { ChoiceTabs } from "@/components/form/choice-tabs";
import { Field, Select, Textarea } from "@/components/form/field";
import { GalleryUpload } from "@/components/form/gallery-upload";
import { Button } from "@/components/ui/button";
import { DoctorCard, type CardDoctor } from "@/components/doctor-card";
import { Modal } from "@/components/modal";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/form/country-select";
import { IntentPicker } from "@/components/form/intent-picker";
import { SPECIALTIES, SPECIALTY_KEYS, specialtyLabel } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { updatePassport } from "./actions";

const SEEKING = [
  { label: "Female MD", value: "female" },
  { label: "Male MD", value: "male" },
  { label: "Both", value: "all" },
] as const;

/** Turns the current form values into what other doctors will see. */
function previewFrom(form: HTMLFormElement, base: CardDoctor): CardDoctor {
  const fd = new FormData(form);
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const name = s("display_name").replace(/^dr\.?\s*/i, "");
  const age = Number(s("age"));
  return {
    ...base,
    display_name: name ? (s("specialty") === "MedicalStudent" ? name : `${s("specialty") === "GeneralPractitioner" ? "dr." : "Dr."} ${name}`) : base.display_name,
    age: Number.isFinite(age) && age > 0 ? age : base.age,
    specialty_title: s("specialty_title") || base.specialty_title,
    hospital: s("hospital") || base.hospital,
    status_text: s("status_text") || base.status_text,
    caffeine: s("caffeine") || base.caffeine,
    stamina: s("stamina") || base.stamina,
    manner: s("manner") || base.manner,
    bio: s("bio"),
    tags: s("tags").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
  };
}

/** A titled block inside the form: heading + one-line hint, fields below. */
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {hint ? <p className="text-body-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function PassportForm({ userId, profile, countries }: { userId: string; profile: Profile; countries: string[] }) {
  const [state, action, pending] = useActionState(updatePassport, {});
  const e = state.errors ?? {};
  const [preview, setPreview] = useState<CardDoctor>(profile);
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (state.saved) {
      toast.success("Passport updated. Chart signed.");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset after a server action result
      setDirty(false);
    }
  }, [state]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form
        action={action}
        className="min-w-0"
        onChange={(ev) => {
          setPreview(previewFrom(ev.currentTarget, preview));
          setDirty(true);
        }}
      >
        {/* Gender is fixed after onboarding: it drives the Bumble protocol. */}
        <input type="hidden" name="gender" value={profile.gender} />
        <Button type="button" variant="outline" className="mb-4 w-full lg:hidden" onClick={() => setPreviewOpen(true)}>
          <Eye /> Preview your card in triage
        </Button>
        <div className="space-y-6 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <Section title="Photos" hint="Up to 4. The first one is what people see in triage.">
            <GalleryUpload
              userId={userId}
              initial={[profile.photo_url, ...(profile.gallery ?? [])]}
              error={e.photo_url}
              onChange={(urls) => {
                setPreview((p) => ({ ...p, photo_url: urls[0] ?? p.photo_url, gallery: urls.slice(1), photo_fallback_url: null }));
                setDirty(true);
              }}
            />
          </Section>

          <Section title="About you">
            <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
              <Field id="display_name" label="Full name" error={e.display_name}>
                <Input id="display_name" name="display_name" defaultValue={profile.display_name.replace(/^dr\.\s*/i, "")} />
              </Field>
              <Field id="age" label="Age" error={e.age}>
                <Input id="age" name="age" type="number" min={21} max={90} defaultValue={profile.age} />
              </Field>
            </div>
            <IntentPicker defaultValue={profile.intent ?? "romance"} />
            <div className="grid gap-2">
              <span className="text-body-sm font-medium">Looking for</span>
              <ChoiceTabs name="seeking" options={SEEKING} defaultValue={profile.seeking} />
            </div>
          </Section>

          <Section title="Clinical" hint="Shown on your card. Your STR lives privately in the Badge tab.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="specialty" label="Specialty" error={e.specialty}>
                <Select id="specialty" name="specialty" defaultValue={profile.specialty}>
                  {SPECIALTY_KEYS.map((k) => <option key={k} value={k}>{SPECIALTIES[k].code} ({specialtyLabel(k)})</option>)}
                </Select>
              </Field>
              <Field id="specialty_title" label="Title on your card" error={e.specialty_title}>
                <Input id="specialty_title" name="specialty_title" defaultValue={profile.specialty_title} />
              </Field>
              <Field id="hospital" label="Hospital, clinic or faculty" error={e.hospital}>
                <Input id="hospital" name="hospital" defaultValue={profile.hospital} />
              </Field>
              <Field id="country" label="Country" error={e.country}>
                <CountrySelect id="country" countries={countries} defaultValue={profile.country} />
              </Field>
            </div>
          </Section>

          <Section title="Vitals" hint="The three tiles and status pill on your card.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="status_text" label="Status" error={e.status_text}>
                <Input id="status_text" name="status_text" defaultValue={profile.status_text} />
              </Field>
              <Field id="caffeine" label="Caffeine level" error={e.caffeine}>
                <Input id="caffeine" name="caffeine" defaultValue={profile.caffeine} />
              </Field>
              <Field id="stamina" label="Call stamina" error={e.stamina}>
                <Input id="stamina" name="stamina" defaultValue={profile.stamina} />
              </Field>
              <Field id="manner" label="Bedside manner" error={e.manner}>
                <Input id="manner" name="manner" defaultValue={profile.manner} />
              </Field>
            </div>
          </Section>

          <Section title="Official clinical prescription">
            <Field id="bio" label="Bio" error={e.bio}>
              <Textarea id="bio" name="bio" maxLength={400} defaultValue={profile.bio} />
            </Field>
            <Field id="tags" label="Tags" hint="Comma separated, up to 8." error={e.tags}>
              <Input id="tags" name="tags" defaultValue={profile.tags.join(", ")} />
            </Field>
          </Section>
        </div>

        {/* Always reachable: sticks above the phone dock / to the bottom on desktop. */}
        <div
          className={cn(
            "sticky bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-20 mt-4 items-center gap-3 rounded-xl border bg-background/85 p-3 shadow-sm backdrop-blur lg:bottom-4 lg:flex",
            dirty || pending || state.error || Object.keys(e).length ? "flex" : "hidden"
          )}
        >
          <p className="min-w-0 flex-1 text-body-sm" role="status">
            {state.error ? (
              <span className="text-red-500">Error: {state.error}</span>
            ) : Object.keys(e).length ? (
              <span className="text-red-500">Error: some fields need attention.</span>
            ) : dirty ? (
              <span className="font-medium">Unsaved changes</span>
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle weight="fill" className="size-4 text-emerald-500" /> All changes saved
              </span>
            )}
          </p>
          <Button type="submit" disabled={pending || !dirty}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>

      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <h2 className="font-semibold">Your card in triage</h2>
          <p className="mb-3 text-body-sm text-muted-foreground">Updates as you type.</p>
          <DoctorCard doc={preview} online />
        </div>
      </aside>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} labelledBy="preview-title" className="max-w-sm p-3">
        <h2 id="preview-title" className="mb-3 font-semibold">Your card in triage</h2>
        <DoctorCard doc={preview} online />
        <Button variant="ghost" className="mt-3 w-full" onClick={() => setPreviewOpen(false)}>Close</Button>
      </Modal>
    </div>
  );
}
