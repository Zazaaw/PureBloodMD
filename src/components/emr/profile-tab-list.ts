/** Doctor profile tabs. Plain module (no "use client") so the server page can read the list. */
export const PROFILE_TABS = ["Threads", "Replies", "Reposts", "Photos"] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];
