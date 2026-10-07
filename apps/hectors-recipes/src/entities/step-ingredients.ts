import { singularize, stripMarkdown } from "./ingredient-line";

// Last words too loose to name a line alone (ux-plan D68): "the sauce" is mostly one the
// recipe makes, and "peel", "stem", "leaf" and "seed" as often mean another plant's, or a verb.
const LOOSE_ENDINGS = new Set(["sauce", "peel", "stem", "leaf", "seed"]);

// Words passed over to find the word that names a line ("chicken" in "boneless skinless
// chicken breasts"): ones that describe it, ones a step uses for something else ("baking"
// powder and a baking sheet, "all"-purpose flour and all sides), and the joining and
// measuring words a name can still carry ("knob of ginger", "ball fresh mozzarella").
const NOT_NAMING = new Set(
  [
    "small medium large extra whole fresh freshly dried dry ground chopped minced diced",
    "sliced shredded grated crushed cracked boneless skinless lean light dark low reduced",
    "unsalted salted sweet hot mild raw cooked uncooked frozen canned toasted roasted",
    "steamed organic plain pure fine coarse ripe overripe baby red green yellow white black",
    "brown unsweetened sweetened full fat free no non added good natural softened melted",
    "cold warm heavy",
    "baking cooking all purpose vegetable water",
    "of and with for in a the",
    "ball jar carton packet package envelope scoop handful knob bunch gallon peel pinch",
    "dash splash bag box bottle piece",
  ]
    .join(" ")
    .split(" "),
);

// The lines a step uses, found by their names in its text (ux-plan D24, D68). It isn't stored,
// so it follows edits to either. A line is used when the step has:
// - its whole name, singular or plural ("olive oil");
// - an ending of it ("oil", "bell pepper"). When other lines' names end the same way, all of
//   them count if the step says it in the plural ("Add the beans") or they're one ingredient
//   listed twice; otherwise none does, so "Heat the oil" doesn't guess between two oils;
// - the word that names it, past words like "large" or "fresh" ("the chicken"), when no other
//   line has that word.
// A name with "or" is each of its sides: "brown or white rice" is brown rice and white rice.
// A name doesn't count where it's only part of another line's longer name ("onion" in
// "slice the green onions").
export function stepIngredients<L extends { name: string | null }>(
  stepText: string,
  lines: L[],
): L[] {
  const written =
    stripMarkdown(stepText)
      .toLowerCase()
      .match(/[\p{L}]+/gu) ?? [];
  const text = written.map(singularize);
  const plural = written.map((word, at) => word !== text[at]);
  const names = lines.map((line) => (line.name ? phrases(line.name) : []));
  const keys = names.map((own) =>
    own.map((phrase) => phrase.join(" ")).join("|"),
  );

  // Where `ending` is in the step, leaving out the places it's part of another line's longer
  // name: the end of it or of one of its endings ("onion" in "green onions", "pepper" in "bell
  // peppers"), or anywhere in the whole of it ("pepper" in "red pepper flakes").
  const found = (ending: string[], index: number) => {
    const taken = new Set<number>();
    names.forEach((own, other) => {
      if (other === index) return;
      for (const phrase of own) {
        if (phrase.length <= ending.length) continue;
        const longer = endsWith(phrase, ending)
          ? phrase
              .slice(0, phrase.length - ending.length)
              .map((_, start) => phrase.slice(start))
          : occurrences(phrase, ending).length > 0
            ? [phrase]
            : [];
        for (const each of longer) {
          for (const at of occurrences(text, each)) {
            for (let k = at; k < at + each.length; k++) taken.add(k);
          }
        }
      }
    });
    return occurrences(text, ending).filter(
      (at) => !ending.some((_, k) => taken.has(at + k)),
    );
  };

  const byEnding = (index: number, ending: string[]) => {
    const at = found(ending, index);
    if (at.length === 0) return false;
    const sharing = names.flatMap((own, other) =>
      own.some((phrase) => endsWith(phrase, ending)) ? [other] : [],
    );
    return (
      sharing.length === 1 ||
      sharing.every((other) => keys[other] === keys[index]) ||
      at.some((start) => plural[start + ending.length - 1])
    );
  };

  const byNamingWord = (index: number, phrase: string[]) => {
    const word = phrase.find((w) => !NOT_NAMING.has(w));
    return (
      word !== undefined &&
      word !== phrase.at(-1) &&
      names.every(
        (own, other) =>
          other === index || !own.some((each) => each.includes(word)),
      ) &&
      found([word], index).length > 0
    );
  };

  return lines.filter((_, index) =>
    (names[index] ?? []).some(
      (phrase) =>
        found(phrase, index).length > 0 ||
        phrase.some(
          (_, start) =>
            start > 0 &&
            !(
              start === phrase.length - 1 &&
              LOOSE_ENDINGS.has(phrase[start] ?? "")
            ) &&
            byEnding(index, phrase.slice(start)),
        ) ||
        byNamingWord(index, phrase),
    ),
  );
}

// A line's name as the phrases a step may use for it: without brackets, and each side of an
// "or", a one-word side taking the last side's last word ("brown or white rice").
function phrases(name: string): string[][] {
  const sides: string[][] = [[]];
  for (const word of words(name.replace(/\([^)]*\)/g, ""))) {
    if (word === "or") sides.push([]);
    else sides.at(-1)?.push(word);
  }
  const named = sides.filter((side) => side.length > 0);
  const last = named.at(-1)?.at(-1);
  return named.flatMap((side, at) => {
    if (at === named.length - 1 || last === undefined) return [side];
    return [
      ...(side.length > 1 ? [side] : []),
      ...(side.at(-1) !== last ? [[...side, last]] : []),
    ];
  });
}

function endsWith(phrase: string[], ending: string[]): boolean {
  return (
    phrase.length >= ending.length &&
    phrase.slice(-ending.length).join(" ") === ending.join(" ")
  );
}

// Where `phrase` starts in `text`, by word.
function occurrences(text: string[], phrase: string[]): number[] {
  const at: number[] = [];
  for (let start = 0; start + phrase.length <= text.length; start++) {
    if (phrase.every((word, k) => text[start + k] === word)) at.push(start);
  }
  return at;
}

// Lowercase words, each made singular, so "Add the onions" and "1 onion" meet.
function words(text: string): string[] {
  return (
    stripMarkdown(text)
      .toLowerCase()
      .match(/[\p{L}]+/gu) ?? []
  ).map(singularize);
}
