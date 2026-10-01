import type { Aisle } from "./aisles";
import { type ItemizedLine, itemizeLine } from "./ingredient-item";
import {
  AMOUNT,
  amountsIn,
  mentionsUnit,
  stripMarkdown,
  toCatalogName,
} from "./ingredient-line";
import type { LineReading, RecipeDraft } from "./models/recipe-draft.model";

// A line as it would be stored after the re-read (ux-plan D30): the reader's fields if every
// one of them checks out against the line's own words, otherwise the instant text split.
export type CheckedLine = ItemizedLine & {
  aisle: Aisle | null;
  itemizedBy: "reader" | "text-split";
  problems: string[];
};

// A schema can only hold the reader to a shape. These hold it to the line: every value must
// come from the line's words, and nothing the text split found may be dropped.
export function checkLineReading(
  raw: string,
  reading: LineReading | null,
): CheckedLine {
  const split = itemizeLine(raw);
  const problems = reading
    ? readingProblems(raw, reading, split)
    : ["Not itemized"];

  if (!reading || problems.length) {
    return { ...split, aisle: null, itemizedBy: "text-split", problems };
  }
  const { aisle, catalogName, quantity, ...fields } = reading;
  return {
    ...fields,
    // The amount as written, exactly: the model gives ⅔ as 0.6667 one time and 0.667 the next.
    quantity:
      quantity === null
        ? null
        : (amountsIn(stripMarkdown(raw)).find((amount) =>
            sameAmount(amount, quantity),
          ) ?? quantity),
    // Named the way the catalog names things, so typed lines and read ones share entries.
    catalogName: catalogName && toCatalogName(catalogName),
    aisle,
    itemizedBy: "reader",
    problems,
  };
}

function readingProblems(
  raw: string,
  reading: LineReading,
  split: ItemizedLine,
): string[] {
  const text = stripMarkdown(raw);
  const lineWords = new Set(wordsOf(text));
  const missingWords = (value: string) =>
    wordsOf(value).filter((word) => !lineWords.has(word));
  const problems: string[] = [];

  if (!reading.name) {
    problems.push("No name");
  } else if (missingWords(reading.name).length) {
    problems.push(`Name "${reading.name}" has words not in the line`);
  }
  if (reading.note && missingWords(reading.note).length) {
    problems.push(`Note "${reading.note}" has words not in the line`);
  }

  // A line that starts with an amount has its amount: the first written, with its unit, as
  // scaling uses ("1 (26 ounce) jar" is 1, not 26 oz). Otherwise any amount written in it.
  if (split.quantity !== null) {
    if (reading.quantity === null) {
      problems.push(`Left out the amount ${split.quantity}`);
    } else if (!sameAmount(split.quantity, reading.quantity)) {
      problems.push(
        `Amount ${reading.quantity} isn't the first one written, ${split.quantity}`,
      );
    }
    if (reading.unit !== split.unit) {
      problems.push(
        reading.unit === null
          ? `Left out the unit "${split.unit}"`
          : `Unit "${reading.unit}" isn't the first amount's unit, "${split.unit ?? "none"}"`,
      );
    }
  } else {
    if (
      reading.quantity !== null &&
      !amountsIn(text).some((amount) =>
        sameAmount(amount, reading.quantity ?? 0),
      )
    ) {
      problems.push(`Amount ${reading.quantity} isn't in the line`);
    }
    if (reading.unit !== null && !mentionsUnit(text, reading.unit)) {
      problems.push(`Unit "${reading.unit}" isn't in the line`);
    } else if (reading.unit === null && split.unit !== null) {
      problems.push(`Left out the unit "${split.unit}"`);
    }
  }

  const saysOptional = /\boptional\b/i.test(text);
  if (saysOptional && !reading.optional) {
    problems.push("The line says optional");
  }
  if (
    reading.optional &&
    !saysOptional &&
    !/\bif (?:desired|you like|needed|using)\b/i.test(text)
  ) {
    problems.push("Marked optional, but the line doesn't say so");
  }
  return problems;
}

// A step's timer is kept only if it's a time written in that step.
export function checkTimer(
  step: string,
  minutes: number | null,
): { timerMinutes: number | null; problem: string | null } {
  if (minutes === null || minutesIn(step).includes(minutes)) {
    return { timerMinutes: minutes, problem: null };
  }
  return {
    timerMinutes: null,
    problem: `Timer of ${minutes} min isn't a time in the step`,
  };
}

// Every time written in the step, in whole minutes: "20 to 25 minutes" gives 20 and 25,
// "1 1/2 hours", "one and a half hours" and "an hour and a half" give 90, "another minute"
// gives 1, and "a 5- to 10-minute rest" gives 5 and 10. Only the amount
// written straight before the unit counts (P14.3), so "Preheat to 350°F. Bake 25 minutes."
// gives 25 alone.
export function minutesIn(step: string): number[] {
  const text = stripMarkdown(step);
  const times: number[] = [];
  let windowStart = 0;
  for (const match of text.matchAll(
    /(?<![A-Za-z])(minutes?|mins?|hours?|hrs?)\b/gi,
  )) {
    const perUnit = match[1]?.toLowerCase().startsWith("h") ? 60 : 1;
    const before = text.slice(
      Math.max(windowStart, match.index - 30),
      match.index,
    );
    const end = match.index + match[0].length;
    const andAHalf = /^\s+and\s+a\s+half\b/i.test(text.slice(end)) ? 0.5 : 0;
    times.push(
      ...amountsBefore(before).map((amount) =>
        Math.round((amount + andAHalf) * perUnit),
      ),
    );
    windowStart = end;
  }
  return times;
}

const FILLER = "(?:\\s+(?:more|additional|extra|further|full|whole))?[\\s-]*$";
const NUMBER_BEFORE = new RegExp(
  `(?:(${AMOUNT})-?\\s*(?:-|–|to|or)\\s*)?(${AMOUNT})(\\s+and\\s+(?:a\\s+half|1/2|½))?${FILLER}`,
  "i",
);
const WORDS_BEFORE = new RegExp(
  `(?:^|[^A-Za-z])(?:((?:one|an?)\\s+and\\s+a\\s+half)|(half\\s+an?|an?\\s+half|half)|an?|one|another)${FILLER}`,
  "i",
);

// The amount, or both ends of a range, at the very end of the text before a unit.
function amountsBefore(before: string): number[] {
  const number = NUMBER_BEFORE.exec(before);
  if (number) {
    const high = amountsIn(number[2] ?? "")[0];
    if (high === undefined) return [];
    const low = number[1] === undefined ? undefined : amountsIn(number[1])[0];
    const half = number[3] ? 0.5 : 0;
    if (low === undefined) return [high + half];
    // "1-1/2" is one and a half, not a range down to a half.
    return Number.isInteger(low) && high < 1
      ? [low + high]
      : [low, high + half];
  }
  const words = WORDS_BEFORE.exec(before);
  if (!words) return [];
  return [words[1] ? 1.5 : words[2] ? 0.5 : 1];
}

// Letters and numbers apart, so "2large eggs" has the word "large".
function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/\p{L}+|\p{N}+/gu) ?? [];
}

// The reader writes ⅓ as 0.33 or 0.333…; both are the line's amount.
function sameAmount(written: number, read: number): boolean {
  return Math.abs(written - read) < 0.01;
}

// A draft held to its own words (D30), for import: each line's reading checked against the
// line, each timer against its step. A line whose reading fails falls back to the text split
// and is listed in `flagged`, for the person to look at before saving.
export type CheckedDraft = RecipeDraft & { flagged: string[] };

export function checkDraft(draft: RecipeDraft): CheckedDraft {
  const flagged: string[] = [];
  const ingredients = draft.ingredients.map(({ raw, section, ...fields }) => {
    const { itemizedBy, problems, ...line } = checkLineReading(raw, fields);
    if (itemizedBy === "text-split") flagged.push(raw);
    return { raw, section, ...line };
  });
  const steps = draft.steps.map((step) => ({
    ...step,
    timerMinutes: checkTimer(step.text, step.timerMinutes).timerMinutes,
  }));
  return { ...draft, ingredients, steps, flagged };
}

// D30's last check, for a read of text (pasted, or a page's): every line and step must be in
// that text, so a read can't change a line ("1 cup sugar" to "1 cup brown sugar") or add one
// from text hidden on a page. They're compared as words and numbers only, so spacing, line
// breaks, punctuation, case, emphasis and how a fraction is written ("1½", "1 1/2") don't
// matter. Each one not found is a note for the person to check before saving. It's a check
// that each line is in the text, not that it's all of it: a line cut short, or one copied from
// text the page hides, still passes.
export function holdToSource(
  draft: CheckedDraft,
  source: string,
): CheckedDraft {
  const words = ` ${comparable(source)} `;
  const missing = [
    ...draft.ingredients.map((line) => line.raw),
    ...draft.steps.map((step) => step.text),
  ].filter((text) => {
    const wanted = comparable(text);
    return wanted && !words.includes(` ${wanted} `);
  });
  if (!missing.length) return draft;
  return {
    ...draft,
    unsure: [
      ...draft.unsure,
      ...missing.map(
        (text) =>
          `"${text.replace(/\s+/g, " ")}" isn't in the recipe's text. Check it against the source.`,
      ),
    ],
  };
}

// Words and numbers, lowercased, a fraction written n/d, and a number apart from a word
// stuck to it: "1½ Cups" and "1 1/2 cups" are both "1 1/2 cups", "113g" is "113 g", and
// "9×13" and "350ºF" read as "9x13" and "350°F" do. × is x; other symbols (™, °, º) are gaps.
function comparable(text: string): string {
  return (
    stripMarkdown(text)
      .replace(/×/g, "x")
      .replace(/[™®©°º]/g, " ")
      .replace(/(\d)([¼-¾⅐-⅞])/g, "$1 $2")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/\u2044/g, "/")
      .replace(/(\p{N})(?=\p{L})|(\p{L})(?=\p{N})/gu, "$1$2 ")
      .match(/[\p{L}\p{N}]+(?:\/\p{N}+)?/gu)
      ?.join(" ") ?? ""
  );
}
