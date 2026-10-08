/** Free bubbles per conversation before the VIP paywall. Mirrors the DB trigger. */
export const FREE_BUBBLE_CAP = 10;

/** Bumble window: hours a new match has before the first incision is "due". */
export const BUMBLE_WINDOW_HOURS = 24;

export const SPECIALTIES = {
  Cardiology: { code: "Sp.JP", title: "Cardiologist", joke: "High hemodynamic chemistry" },
  Surgery: { code: "Sp.B / Sp.U", title: "General Surgeon", joke: "Sterile field romance" },
  OBGYN: { code: "Sp.OG", title: "Obstetrician & Gynecologist", joke: "Delivering dynasties" },
  Orthopedics: { code: "Sp.OT", title: "Orthopedic Surgeon", joke: "Owns power tools" },
  Psychiatry: { code: "Sp.KJ", title: "Psychiatrist", joke: "Unconditional positive regard" },
  Neurosurgery: { code: "Sp.BS", title: "Neurosurgeon", joke: "High intellect synergy" },
  Neurology: { code: "Sp.N", title: "Neurologist", joke: "Tests your reflexes on date 1" },
  Anesthesiology: { code: "Sp.An", title: "Anesthesiologist", joke: "Calm under code blue" },
  Dermatology: { code: "Sp.DVE", title: "Dermatologist & Venereologist", joke: "Normal working hours" },
  Radiology: { code: "Sp.Rad", title: "Diagnostic Radiologist", joke: "Thrives in dark cozy rooms" },
  Ophthalmology: { code: "Sp.M", title: "Ophthalmologist", joke: "Only has eyes for you" },
  PlasticSurgery: { code: "Sp.BP-RE", title: "Plastic & Reconstructive Surgeon", joke: "Aesthetic perfection" },
  Pediatrics: { code: "Sp.A", title: "Pediatrician", joke: "Patient & gentle soul" },
  Pulmonology: { code: "Sp.P", title: "Pulmonologist", joke: "Takes your breath away" },
  GeneralPractitioner: { code: "dr. (GP)", title: "General Practitioner", joke: "Knows a little about every organ" },
  MedicalStudent: { code: "S.Ked (Koas)", title: "Medical Student (Koas)", joke: "Pureblood in progress" },
} as const;

export type SpecialtyKey = keyof typeof SPECIALTIES;
export const SPECIALTY_KEYS = Object.keys(SPECIALTIES) as SpecialtyKey[];

/** Display label for a specialty key ("PlasticSurgery" -> "Plastic Surgery"). */
export const specialtyLabel = (k: SpecialtyKey) =>
  ({ PlasticSurgery: "Plastic Surgery", GeneralPractitioner: "General Practitioner", MedicalStudent: "Medical Student" })[
    k as string
  ] ?? k;

/** Countries a doctor can register in (ISO 3166-1 alpha-2). Names come from Intl. */
export const COUNTRY_CODES = [
  "ID", "MY", "SG", "BN", "TH", "PH", "VN", "KH", "MM", "LA", "TL",
  "AU", "NZ", "JP", "KR", "CN", "TW", "HK", "IN", "PK", "BD", "LK",
  "SA", "AE", "QA", "EG", "TR", "NL", "DE", "GB", "FR", "IE", "US", "CA",
] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

// A fixed table, not Intl.DisplayNames: Node and browsers ship different ICU
// data ("Hong Kong" vs "Hong Kong SAR China"), which breaks hydration.
const COUNTRY_NAMES: Record<CountryCode, string> = {
  ID: "Indonesia", MY: "Malaysia", SG: "Singapore", BN: "Brunei", TH: "Thailand", PH: "Philippines",
  VN: "Vietnam", KH: "Cambodia", MM: "Myanmar", LA: "Laos", TL: "Timor-Leste", AU: "Australia",
  NZ: "New Zealand", JP: "Japan", KR: "South Korea", CN: "China", TW: "Taiwan", HK: "Hong Kong",
  IN: "India", PK: "Pakistan", BD: "Bangladesh", LK: "Sri Lanka", SA: "Saudi Arabia",
  AE: "United Arab Emirates", QA: "Qatar", EG: "Egypt", TR: "Turkey", NL: "Netherlands", DE: "Germany",
  GB: "United Kingdom", FR: "France", IE: "Ireland", US: "United States", CA: "Canada",
};
export const countryName = (code: string) => COUNTRY_NAMES[code as CountryCode] ?? code;

/** Radar radius steps (km). Above the max we show the whole country. */
export const RADIUS_MIN = 5;
export const RADIUS_MAX = 100;

/** Report reasons, ordered by severity. Mirrors the DB check constraint. */
export const REPORT_REASONS = [
  { value: "sexual_harassment", label: "Sexual harassment", hint: "Unwanted sexual comments, advances or pressure." },
  { value: "unsolicited_explicit_content", label: "Unsolicited explicit photos", hint: "Nudity or sexual images you did not ask for." },
  { value: "verbal_abuse", label: "Verbal abuse or bullying", hint: "Insults, humiliation, repeated hostility." },
  { value: "threats", label: "Threats or intimidation", hint: "Threats of violence, stalking, blackmail, doxxing." },
  { value: "hate_speech", label: "Hate speech", hint: "Attacks on religion, ethnicity, gender, disability, orientation." },
  { value: "fake_profile", label: "Fake profile or not a doctor", hint: "Impersonation, stolen photos, fake STR." },
  { value: "scam_or_spam", label: "Scam or spam", hint: "Asking for money, crypto, links, selling things." },
  { value: "underage", label: "May be underage", hint: "This person looks or says they are under 21." },
  { value: "self_harm", label: "Self-harm concern", hint: "They mentioned hurting themselves. We will reach out." },
  { value: "other", label: "Something else", hint: "Tell us what happened below." },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const TRAITS = [
  "Caffeine Tolerant",
  "Tolerates 36-hr Shifts",
  "Looks Great in Figs Scrubs",
  "Littmann Cardiology IV Owner",
  "Board Exam High Scorer",
  "Emotionally Stable in ICU",
  "Illegible Handwriting",
] as const;

export const QUICK_FLIRTS = [
  { label: "Interpret my ECG?", text: "Doc, can you interpret my ECG? It shows acute love syndrome 🫀" },
  { label: "Post-call coffee date?", text: "Are you post-call tomorrow? Let's get coffee and pretend we slept 8 hours ☕" },
  { label: "Rx: dinner in Senopati", text: "Rx: One dinner date in Senopati, stat! Non-negotiable 🥐" },
  { label: "I won't page you", text: "I promise not to page you when you are on your break 😉" },
  { label: "Auscultate my heart?", text: "Can you auscultate my heart? It's tachycardic because of you 💓" },
] as const;

export const GENDER_TABS = ["Female MD", "Male MD", "Both"] as const;
export const tabToSeeking = (t: string) => (t === "Female MD" ? "female" : t === "Male MD" ? "male" : "all");
export const seekingToTab = (s: string) => (s === "female" ? "Female MD" : s === "male" ? "Male MD" : "Both");

/** VIP plans. Indonesia pays in rupiah, every other country in USD. Mirrors public.plan_price(). */
export const PLANS = [
  { id: "monthly", label: "Monthly", months: 1, idr: 50_000, usd: 20 },
  { id: "quarterly", label: "3 months", months: 3, idr: 130_000, usd: 50 },
  { id: "annual", label: "Annual", months: 12, idr: 550_000, usd: 230 },
] as const;
export type PlanId = (typeof PLANS)[number]["id"];

export function planPrice(country: string, plan: (typeof PLANS)[number]) {
  return country === "ID" ? { currency: "IDR" as const, amount: plan.idr } : { currency: "USD" as const, amount: plan.usd };
}

export function formatMoney(amount: number, currency: "IDR" | "USD" | string) {
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Consults with no message for this long are deleted automatically (pg_cron). */
export const CONSULT_TTL_DAYS = 30;

/** What VIP unlocks; shown in the VIP dialog and on Passport. */
export const VIP_PERKS = [
  "Unlimited chat bubbles (no 10-message lock)",
  "Golden stethoscope crown on your card",
  "Extend proximity radius to 100 km",
  "100% anti-non-doctor shield (zero MBAs or tech bros)",
  "Future offspring medical board predictor tool",
];
