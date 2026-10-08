// The invite in a pasted link (ux-plan P23.4): the token after /join/, from the whole
// address or the path alone, whatever comes before it. Only the token is used, to open this
// app's own Join page, so the link's host doesn't matter. Anything else is null.
export function inviteTokenFrom(text: string): string | null {
  const match = text.trim().match(/\/join\/([A-Za-z0-9_-]{8,100})(?:[/?#]|$)/);
  return match?.[1] ?? null;
}
