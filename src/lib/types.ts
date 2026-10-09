import type { SpecialtyKey } from "./constants";

export type Gender = "female" | "male";
export type Seeking = Gender | "all";

export type Profile = {
  id: string;
  user_id: string | null;
  is_bot: boolean;
  is_featured: boolean;
  display_name: string;
  gender: Gender;
  seeking: Seeking;
  /** Dating ("romance") or meeting colleagues ("connect"). */
  intent: "romance" | "connect";
  age: number;
  specialty: SpecialtyKey;
  specialty_title: string;
  hospital: string;
  base_city?: string | null;
  country: string;
  /** Computed by get_candidates from private coarse locations; null when radar is off. */
  distance_km: number | null;
  photo_url: string;
  photo_fallback_url: string | null;
  caffeine: string;
  stamina: string;
  manner: string;
  status_text: string;
  bio: string;
  tags: string[];
  replies: string[];
  opener: string | null;
  is_vip: boolean;
  /** Set while the member has paused their account (hidden from triage and consults). */
  deactivated_at?: string | null;
  /** Up to 3 extra photos; the card shows [photo_url, ...gallery]. */
  gallery: string[];
  /** Badge only when BOTH are true (ID + medical license reviewed). */
  identity_verified: boolean;
  doctor_verified: boolean;
  /** From get_candidates: this doctor Super Liked me. */
  superliked_me?: boolean;
  created_at: string;
};

export type InboxRow = {
  match_id: string;
  matched_at: string;
  other_id: string;
  other_name: string;
  other_gender: Gender;
  other_photo: string;
  other_photo_fallback: string | null;
  other_specialty_title: string;
  other_hospital: string;
  other_distance: number | null;
  other_is_bot: boolean;
  other_verified: boolean;
  last_body: string | null;
  last_is_image: boolean | null;
  last_at: string | null;
  last_sender: string | null;
  /** Counted on the match: survives "delete chat", drives the quota and Bumble rule. */
  bubble_count: number;
  /** End of the consult: match + 24 h while nobody has written, else last message + 30 days. */
  expires_at: string;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  created_at: string;
};

export type Credentials = {
  profile_id: string;
  str_number: string;
  alma_mater: string;
  class_year: number;
};

export type BlockedRow = {
  profile_id: string;
  display_name: string;
  photo_url: string;
  photo_fallback_url: string | null;
  specialty_title: string;
  blocked_at: string;
};

export type Subscription = {
  id: string;
  plan: "monthly" | "quarterly" | "annual";
  currency: "IDR" | "USD";
  amount: number;
  started_at: string;
  period_end: string;
  cancel_at_period_end: boolean;
  active: boolean;
};

export type VerificationRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  reviewer_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type EmrImage = { path: string; w: number; h: number };

/** Author columns embedded in every EMR post. */
export type EmrAuthor = Pick<
  Profile,
  "id" | "display_name" | "photo_url" | "photo_fallback_url" | "specialty_title" | "identity_verified" | "doctor_verified"
>;

/** A thread (no parent), a comment (parent = thread) or a reply (parent = comment). */
export type EmrPost = {
  id: string;
  author_id: string;
  parent_id: string | null;
  root_id: string | null;
  body: string;
  images: EmrImage[];
  reply_count: number;
  like_count: number;
  /** Set when the author deleted a post that already had replies. */
  deleted_at: string | null;
  created_at: string;
  author: EmrAuthor;
  /** Filled in by hydratePosts. */
  liked: boolean;
  /** Signed URLs, same order as images. */
  urls: string[];
};
