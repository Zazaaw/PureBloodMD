/** The blue badge means a human reviewed the person's ID (KTP) AND medical license. */
export const isVerified = (p: { identity_verified?: boolean; doctor_verified?: boolean }) =>
  Boolean(p.identity_verified && p.doctor_verified);
