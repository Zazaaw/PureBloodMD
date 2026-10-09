import { COUNTRY_CODES, SPECIALTY_KEYS, type SpecialtyKey } from "@/lib/constants";
import type { Gender, Seeking } from "@/lib/types";

export type ProfileInput = {
  display_name: string;
  gender: Gender;
  seeking: Seeking;
  intent: "romance" | "connect";
  age: number;
  specialty: SpecialtyKey;
  specialty_title: string;
  hospital: string;
  country: string;
  bio: string;
  caffeine: string;
  stamina: string;
  manner: string;
  status_text: string;
  tags: string[];
  photo_url: string;
  gallery: string[];
};

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Shared by onboarding and the passport editor. Returns field errors, never throws. */
export function parseProfile(fd: FormData, supabaseUrl: string, activeCountries: readonly string[] = COUNTRY_CODES) {
  const errors: Record<string, string> = {};
  const rawName = str(fd, "display_name").replace(/^dr\.?\s*/i, "");
  if (rawName.length < 2) errors.display_name = "Your name, Doctor.";

  const gender = str(fd, "gender") as Gender;
  if (!["female", "male"].includes(gender)) errors.gender = "Pick one.";
  const seeking = str(fd, "seeking") as Seeking;
  if (!["female", "male", "all"].includes(seeking)) errors.seeking = "Pick one.";

  const age = Number(str(fd, "age"));
  if (!Number.isInteger(age) || age < 21 || age > 90) errors.age = "Age between 21 and 90.";

  const specialty = str(fd, "specialty") as SpecialtyKey;
  if (!SPECIALTY_KEYS.includes(specialty)) errors.specialty = "Choose your specialty.";
  const specialty_title = str(fd, "specialty_title");
  if (specialty_title.length < 2 || specialty_title.length > 80) errors.specialty_title = "2 to 80 characters.";

  const hospital = str(fd, "hospital");
  if (hospital.length < 2 || hospital.length > 120) errors.hospital = "Where do you take calls?";

  const country = str(fd, "country");
  if (!activeCountries.includes(country)) errors.country = activeCountries.length === 1 ? "PureBloodMD is open in Indonesia only for now." : "Choose a country.";

  // Specialists are "Dr.", GPs are "dr." (Indonesian convention), students have no title yet.
  const name =
    specialty === "MedicalStudent" ? rawName : specialty === "GeneralPractitioner" ? `dr. ${rawName}` : `Dr. ${rawName}`;

  const bio = str(fd, "bio");
  if (bio.length > 400) errors.bio = "Keep it under 400 characters. Like a good discharge summary.";

  const short = (k: string, fallback: string) => {
    const v = str(fd, k) || fallback;
    if (v.length > 60) errors[k] = "Max 60 characters.";
    return v;
  };

  const tags = str(fd, "tags")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (tags.some((t) => t.length > 40)) errors.tags = "Each tag max 40 characters.";

  // Photo is REQUIRED and must live in our own Supabase Storage bucket.
  const ownBucket = `${supabaseUrl}/storage/v1/object/public/avatars/`;
  const photo_url = str(fd, "photo_url");
  if (!photo_url.startsWith(ownBucket)) {
    errors.photo_url = "Upload a profile photo. No photo, no profile.";
  }
  // Up to 3 extra photos, also only from our bucket.
  const gallery = fd
    .getAll("gallery")
    .map((v) => String(v).trim())
    .filter((u) => u.startsWith(ownBucket) && u !== photo_url)
    .slice(0, 3);

  const data: ProfileInput = {
    display_name: name,
    gender,
    seeking,
    intent: str(fd, "intent") === "connect" ? "connect" : "romance",
    age,
    specialty,
    specialty_title,
    hospital,
    country,
    bio,
    caffeine: short("caffeine", "4 Espresso/day"),
    stamina: short("stamina", "36-hr S-Tier"),
    manner: short("manner", "10/10 Gentle"),
    status_text: short("status_text", "Post-call • Available"),
    tags,
    photo_url,
    gallery,
  };
  return { data, errors };
}
