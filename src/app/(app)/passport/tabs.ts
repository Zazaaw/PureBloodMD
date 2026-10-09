/** Shared by the server page (parses ?tab=) and the client shell. */
export const PASSPORT_TABS = ["Profile", "Badge", "VIP", "Settings"] as const;
export type PassportTab = (typeof PASSPORT_TABS)[number];

