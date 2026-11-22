// The title search matches (R2, KTD10): in lower case, without accents, punctuation or a leading
// "the", "a" or "an". games.search_title holds it, written whenever the title is, and search
// normalizes what's typed the same way, so "The Castles of Burgundy" and "castles of burgundy"
// meet. It isn't a generated column: Postgres's accent-stripping function can't be used in one.
const LEADING_ARTICLE = /^(?:the|a|an) /;

// A title matches what's typed when pg_trgm's word similarity between them is above this (KTD10).
// Measured on PGlite's pg_trgm, 2026-11-22: a one-letter typo keeps a title above it ("harbr
// lights" 0.69 for Harbor Lights, "catn" 0.60 for Catan), and so do two typed letters ("ha" 0.67),
// while one letter ("h") and a title sharing only one word of several ("harbor lihgts" for Harbor
// Master) sit at 0.5. U24 checks it on the real catalog.
export const SEARCH_MATCH_ABOVE = 0.5;

export function toSearchTitle(title: string): string {
  return (
    title
      .toLowerCase()
      // NFKD splits an accented letter into the letter and its accent, which goes next.
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      // Punctuation and spaces, in any run, become one space.
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(LEADING_ARTICLE, "")
  );
}
