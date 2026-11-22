// The code a friend link or a night's link carries (KTD18; docs/data-model.md, friend_links): 8
// characters in two groups of four, from Crockford's base 32, which has no look-alike
// characters, so a person can read it aloud ("K7Q2-HARB").
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TOKEN_PATTERN = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

// A link lasts a week (R49).
export const FRIEND_LINK_DAYS = 7;

// Each byte picks one of the 32 characters: 256 is 8 times 32, so every character is as likely.
export function newLinkToken(): string {
  const characters = [...crypto.getRandomValues(new Uint8Array(8))].map(
    (byte) => ALPHABET[byte % ALPHABET.length],
  );
  return `${characters.slice(0, 4).join("")}-${characters.slice(4).join("")}`;
}

// What a link's address holds, in capitals, if it has a token's form; checked before any read
// (KTD4), so anything else is a link that doesn't work.
export function linkTokenOf(value: string): string | null {
  const token = value.trim().toUpperCase();
  return TOKEN_PATTERN.test(token) ? token : null;
}
