import { singularize, stripMarkdown } from "./ingredient-line";

// The recipe lines a step uses, found by their names in its text (ux-plan D24). It isn't
// stored, so it follows edits to either. A name matches whole ("olive oil"), singular or
// plural, or by an ending ("bell pepper", "oil") that no other line's name shares, so
// "Heat the oil" finds the olive oil but "Add the beans" doesn't guess between two cans.
export function stepIngredients<L extends { name: string | null }>(
  stepText: string,
  lines: L[],
): L[] {
  const text = ` ${words(stepText).join(" ")} `;
  const phrases = lines.map((line) =>
    line.name ? words(line.name.replace(/\([^)]*\)/g, "")) : [],
  );
  const endsWith = (phrase: string[], ending: string[]) =>
    phrase.slice(-ending.length).join(" ") === ending.join(" ");
  // The text without other lines' longer names that end in these words, so "onion" isn't
  // found in "slice the green onions".
  const without = (ending: string[], index: number) =>
    phrases.reduce(
      (rest, other, otherIndex) =>
        otherIndex !== index &&
        other.length > ending.length &&
        endsWith(other, ending)
          ? rest.replaceAll(` ${other.join(" ")} `, " | ")
          : rest,
      text,
    );

  const used: L[] = [];
  lines.forEach((line, index) => {
    const phrase = phrases[index] ?? [];
    for (let start = 0; start < phrase.length; start++) {
      const ending = phrase.slice(start);
      const shared = phrases.filter((other) => endsWith(other, ending)).length;
      if (
        (start === 0 || shared === 1) &&
        without(ending, index).includes(` ${ending.join(" ")} `)
      ) {
        used.push(line);
        return;
      }
    }
  });
  return used;
}

// Lowercase words, each made singular, so "Add the onions" and "1 onion" meet.
function words(text: string): string[] {
  return (
    stripMarkdown(text)
      .toLowerCase()
      .match(/[\p{L}]+/gu) ?? []
  ).map(singularize);
}
