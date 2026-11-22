// The title search matches (R2, KTD10): in lower case, without accents, punctuation or a leading
// "the", "a" or "an". games.search_title holds it, written whenever the title is, and search
// normalizes what's typed the same way, so "The Castles of Burgundy" and "castles of burgundy"
// meet. It isn't a generated column: Postgres's accent-stripping function can't be used in one.
const LEADING_ARTICLE = /^(?:the|a|an) /;

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
