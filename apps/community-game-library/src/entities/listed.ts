// "A, B and C": a list in a sentence (B5's designers, B13's expansions, C10's turns).
export function listed(items: readonly string[]): string {
  return items.length < 2
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
