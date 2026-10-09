"use client";

import { useActionState, useState } from "react";
import { ChoiceTabs } from "@/components/form/choice-tabs";
import { Field, Select, Textarea } from "@/components/form/field";
import { GalleryUpload } from "@/components/form/gallery-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/form/country-select";
import { SPECIALTIES, SPECIALTY_KEYS, specialtyLabel, type SpecialtyKey } from "@/lib/constants";
import { createPassport } from "./actions";

const GENDERS = [
  { label: "Female MD", value: "female" },
  { label: "Male MD", value: "male" },
] as const;
const SEEKING = [
  { label: "Female MD", value: "female" },
  { label: "Male MD", value: "male" },
  { label: "Both", value: "all" },
] as const;

export function OnboardingForm({ userId, defaultCountry, countries }: { userId: string; defaultCountry: string; countries: string[] }) {
  const [state, action, pending] = useActionState(createPassport, {});
  const [specialty, setSpecialty] = useState<SpecialtyKey>("Cardiology");
  const [titles, setTitles] = useState<Record<string, string>>({});
  const e = state.errors ?? {};
  // React resets uncontrolled fields after an action; echo back what was typed.
  const v = state.values ?? {};

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Who you are</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <GalleryUpload userId={userId} initial={v.photo_url ? [v.photo_url] : []} error={e.photo_url} />
          <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
            <Field id="display_name" label="Full name" hint="We add the “Dr.” for you." error={e.display_name}>
              <Input id="display_name" name="display_name" required placeholder="Sarah Alatas" autoComplete="name" defaultValue={v.display_name} />
            </Field>
            <Field id="age" label="Age" error={e.age}>
              <Input id="age" name="age" type="number" inputMode="numeric" min={21} max={90} required defaultValue={v.age ?? 29} />
            </Field>
          </div>
          <div className="grid gap-2">
            <span className="text-body-sm font-medium">I am a</span>
            <ChoiceTabs name="gender" options={GENDERS} defaultValue={v.gender ?? "female"} />
          </div>
          <div className="grid gap-2">
            <span className="text-body-sm font-medium">Looking for</span>
            <ChoiceTabs name="seeking" options={SEEKING} defaultValue={v.seeking ?? "male"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clinical credentials</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field id="specialty" label="Specialty" error={e.specialty}>
            <Select
              id="specialty"
              name="specialty"
              value={specialty}
              onChange={(ev) => setSpecialty(ev.target.value as SpecialtyKey)}
            >
              {SPECIALTY_KEYS.map((k) => (
                <option key={k} value={k}>
                  {SPECIALTIES[k].code} ({specialtyLabel(k)})
                </option>
              ))}
            </Select>
          </Field>
          <Field id="specialty_title" label="Title on your card" error={e.specialty_title}>
            <Input
              id="specialty_title"
              name="specialty_title"
              value={titles[specialty] ?? SPECIALTIES[specialty].title}
              onChange={(ev) => setTitles((t) => ({ ...t, [specialty]: ev.target.value }))}
            />
          </Field>
          <Field id="hospital" label="Hospital, clinic or faculty" error={e.hospital}>
            <Input id="hospital" name="hospital" required placeholder="RSUP Harapan Kita" defaultValue={v.hospital} />
          </Field>
          <Field id="country" label="Country" hint={countries.length > 1 ? "Distance comes from the radar in Triage, not from your city." : "Indonesia only during launch. Distance comes from the radar in Triage."} error={e.country}>
            <CountrySelect id="country" countries={countries} defaultValue={v.country ?? defaultCountry} />
          </Field>
          <Field id="str_number" label="STR number (NIM for students)" hint="Not actually checked. We trust your handwriting." error={e.str_number}>
            <Input id="str_number" name="str_number" required placeholder="KKI-STR-2026-998811" className="font-mono uppercase" defaultValue={v.str_number} />
          </Field>
          <Field id="alma_mater" label="Alma mater" error={e.alma_mater}>
            <Input id="alma_mater" name="alma_mater" required placeholder="FK UI" defaultValue={v.alma_mater} />
          </Field>
          <Field id="class_year" label="Class of" error={e.class_year}>
            <Input id="class_year" name="class_year" type="number" inputMode="numeric" min={1970} max={2035} defaultValue={v.class_year ?? 2018} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vitals &amp; prescription</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <Field id="caffeine" label="Caffeine level" error={e.caffeine}>
            <Input id="caffeine" name="caffeine" placeholder="4 Espresso/day" defaultValue={v.caffeine} />
          </Field>
          <Field id="stamina" label="Call stamina" error={e.stamina}>
            <Input id="stamina" name="stamina" placeholder="36-hr S-Tier" defaultValue={v.stamina} />
          </Field>
          <Field id="manner" label="Bedside manner" error={e.manner}>
            <Input id="manner" name="manner" placeholder="10/10 Gentle" defaultValue={v.manner} />
          </Field>
          <Field id="bio" label="Official clinical prescription (bio)" error={e.bio} className="sm:col-span-3">
            <Textarea
              id="bio"
              name="bio"
              maxLength={400}
              placeholder="Are you ventricular fibrillation? Because you make my heart beat irregularly fast."
              defaultValue={v.bio}
            />
          </Field>
          <Field id="tags" label="Tags" hint="Comma separated, up to 8." error={e.tags} className="sm:col-span-3">
            <Input id="tags" name="tags" placeholder="Cath Lab Lead, Never Cancels Dates, Owns 12 Figs Scrubs" defaultValue={v.tags} />
          </Field>
          <input type="hidden" name="status_text" value="Post-call • Available" />
        </CardContent>
      </Card>

      {state.error ? <p role="alert" className="text-body-sm text-red-500">Error: {state.error}</p> : null}
      {Object.keys(e).length ? (
        <p role="alert" className="text-body-sm text-red-500">Error: a few fields need attention above.</p>
      ) : null}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Verifying pureblood lineage…" : "Issue my passport"}
      </Button>
    </form>
  );
}
