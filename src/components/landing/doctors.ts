/**
 * Featured bot doctors from supabase/seed-doctors.json (the ones with studio
 * photos). The landing shows people who are really in the deck, so a visitor
 * who signs up can meet the same faces in Triage.
 */
export type LandingDoctor = {
  name: string;
  code: string;
  title: string;
  hospital: string;
  photo: string;
  fallback: string;
  opener: string;
};

const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=80`;

export const LANDING_DOCTORS: LandingDoctor[] = [
  { name: "Dr. Aurelia Chen", code: "Sp.DVE", title: "Dermatologist", hospital: "Siloam TB Simatupang", photo: u("1559839734-2b71ea197ec2"), fallback: "https://randomuser.me/api/portraits/women/90.jpg", opener: "I noticed your skin barrier looks healthy in your photos. Professionally impressed, personally interested 💅" },
  { name: "Dr. Keenan Raditya", code: "Sp.JP", title: "Cardiologist", hospital: "RSUP Harapan Kita", photo: u("1622253692010-333f2da6031d"), fallback: "https://randomuser.me/api/portraits/men/82.jpg", opener: "My heart skipped a beat when we matched. Should I be worried, or should we get coffee? 🫀" },
  { name: "Dr. Nadya Kartika", code: "Sp.KJ", title: "Psychiatrist", hospital: "RS Jiwa Dharmawangsa", photo: u("1573496359142-b8d87734a5a2"), fallback: "https://randomuser.me/api/portraits/women/88.jpg", opener: "I'm sensing a strong positive transference already. Let's explore it over coffee 🛋️" },
  { name: "Dr. Raditya Pratama", code: "Sp.B", title: "General Surgeon", hospital: "RSCM Jakarta", photo: u("1537368910025-700350fe46c7"), fallback: "https://randomuser.me/api/portraits/men/81.jpg", opener: "I just finished a 6-hour surgery and the first thing I wanted to do was text you. Not eat. Text you. 🥼" },
  { name: "Dr. Clarissa Utami", code: "Sp.M", title: "Ophthalmologist", hospital: "Jakarta Eye Center", photo: u("1527613426441-4da17471b66d"), fallback: "https://randomuser.me/api/portraits/women/87.jpg", opener: "My pupils just dilated looking at your profile. That's a medically documented sign of attraction 👁️" },
  { name: "Dr. Brandon Lee", code: "Sp.OT", title: "Orthopedic Surgeon", hospital: "RS Premiere Bintaro", photo: u("1612349317150-e413f6a5b16d"), fallback: "https://randomuser.me/api/portraits/men/79.jpg", opener: "You must be a femur, because you're the strongest match I've had all year 🦴" },
  { name: "Dr. Stella Wijaya", code: "Sp.N", title: "Neurologist", hospital: "RS Mayapada Kuningan", photo: u("1534528741775-53994a69daeb"), fallback: "https://randomuser.me/api/portraits/women/85.jpg", opener: "Quick neuro exam: did you smile reading this? CN VII intact. Coffee? 🧠" },
  { name: "Dr. Farhan N.", code: "Sp.An", title: "Anesthesiologist", hospital: "RS Pondok Indah", photo: u("1582750433449-648ed127bb54"), fallback: "https://randomuser.me/api/portraits/men/80.jpg", opener: "Fair warning: talking to me is very relaxing. Side effects may include falling for me 😴" },
  { name: "Dr. Jessica Amanda", code: "Sp.OG", title: "Obstetrician", hospital: "RSIA Bunda Menteng", photo: u("1651008376811-b90baee60c1f"), fallback: "https://randomuser.me/api/portraits/women/89.jpg", opener: "I've delivered 4 babies today but this match is the best thing I've delivered all week 👶" },
  { name: "Dr. Aris Danuarta", code: "Sp.BS", title: "Neurosurgeon", hospital: "RS Pusat Otak Nasional", photo: u("1507003211169-0a1dd7228f2d"), fallback: "https://randomuser.me/api/portraits/men/78.jpg", opener: "I've seen a lot of brains, but yours caught my attention from your profile alone 🧠" },
  { name: "Dr. Vania Priscilla", code: "Sp.A", title: "Pediatrician", hospital: "RS Brawijaya Antasari", photo: u("1517841905240-472988babdf9"), fallback: "https://randomuser.me/api/portraits/women/84.jpg", opener: "You've been very brave swiping on me, so you get a sticker and a coffee date 🍭" },
  { name: "Dr. Dimas Wicaksono", code: "Sp.Rad", title: "Radiologist", hospital: "RS Mayapada Jaksel", photo: u("1622902046580-2b47f47f5471"), fallback: "https://randomuser.me/api/portraits/men/77.jpg", opener: "I've seen thousands of scans but nothing as clear as this match 🩻" },
  { name: "Dr. Michelle Tan", code: "Sp.BP-RE", title: "Plastic Surgeon", hospital: "RS Medistra", photo: u("1544005313-94ddf0286df2"), fallback: "https://randomuser.me/api/portraits/women/86.jpg", opener: "Professional opinion: zero modifications needed. Personal opinion: coffee? ✨" },
  { name: "Dr. Kevin Jonathan", code: "Sp.U", title: "Urologist", hospital: "RS Fatmawati", photo: u("1519085360753-af0119f7cbe7"), fallback: "https://randomuser.me/api/portraits/men/75.jpg", opener: "I just finished a 6-hour surgery and the first thing I wanted to do was text you. Not eat. Text you. 🥼" },
  { name: "Dr. Alana Kusuma", code: "Sp.P", title: "Pulmonologist", hospital: "RS Mayapada TB Simatupang", photo: u("1508214751196-bcfd4ca60f91"), fallback: "https://randomuser.me/api/portraits/women/83.jpg", opener: "I just did a spirometry test and you took more breath away than expected 🫁" },
  { name: "Dr. Gilang Ramadhan", code: "Sp.An-TI", title: "Intensivist", hospital: "RS Siloam Kebon Jeruk", photo: u("1500648767791-00dcc994a43e"), fallback: "https://randomuser.me/api/portraits/men/76.jpg", opener: "Fair warning: talking to me is very relaxing. Side effects may include falling for me 😴" },
];

/** Pick doctors by first name, so sections read clearly in code. */
export const doctor = (first: string) => LANDING_DOCTORS.find((d) => d.name.split(" ")[1] === first)!;

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
