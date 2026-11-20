const LEADING_ARTICLE = /^(the|a|an)\s+/;

// KTD10: a title in lower case, without accents, punctuation or a leading article, so
// "The Castles of Burgundy" and "castles of burgundy" match the same row.
export function toSearchTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(LEADING_ARTICLE, "");
}
