// The ways in the app offers (A2, A8): Google, and an email with a password. An account can have
// both: a Google account that resets a password gets one.
export const WAYS_IN = ["google", "password"] as const;
export type WayIn = (typeof WAYS_IN)[number];

const WORDS: Record<WayIn, string> = {
  google: "Google",
  password: "a password",
};

// E5's account line (Hector, 2026-11-25): how the member signs in, then their email, which a
// no-break space keeps beside its dot, as the board keeps "· robin@example.com" on one line. An
// account with no way in the app offers (a provider it doesn't show) has the email alone.
export function signedInLine(waysIn: readonly WayIn[], email: string): string {
  const ways = WAYS_IN.filter((way) => waysIn.includes(way));
  if (ways.length === 0) {
    return `Signed in as ${email}`;
  }
  return `Signed in with ${ways.map((way) => WORDS[way]).join(" or ")} ·\u00a0${email}`;
}
