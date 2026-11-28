// The Start here walkthrough: Hector's intro talk, rewritten for someone reading alone (D4), one
// idea per step with at most three blocks on screen (R6). Each step lives at /start/<slug>, the
// first also at /start. A slug is a link people may have been sent, so it never changes or gets
// reused. Hector reviews the words before they ship (H6).
//
// In a text block, [[shown words|glossary-slug]] marks a word's first use on the step, which
// renders as <Word> (R19).

import type { DepositFrequency } from "@/src/finance/growth";
import type { WordSlug } from "./words";

type Diagram =
  | "money-in-and-out"
  | "own-and-owe"
  | "work-and-spend-loop"
  | "money-works-loop"
  | "cash-flow"
  | "where-pay-goes"
  | "pay-yourself-first";

type StepBlock =
  | { kind: "text"; text: string }
  | { kind: "list"; items: readonly string[] }
  | { kind: "diagram"; diagram: Diagram }
  // A live growth example: the talk's numbers, with the deposit as the one field to change (R8).
  | {
      kind: "growth";
      deposit: number;
      frequency: DepositFrequency;
      depositYears: number;
      years: number;
      yearlyReturn: number;
      startAge: number;
    }
  | { kind: "link"; slug: string; label: string }
  | { kind: "topics" };

type Step = { slug: string; title: string; blocks: readonly StepBlock[] };

export const STEPS: readonly Step[] = [
  {
    slug: "why-money-matters",
    title: "Why money is worth learning",
    blocks: [
      {
        kind: "text",
        text: "Money isn't the point. What it gives you is.",
      },
      {
        kind: "list",
        items: [
          "Freedom: more say over your own choices.",
          "Security: a cushion when something goes wrong.",
          "Opportunity: room to invest in what you want next.",
        ],
      },
      {
        kind: "text",
        text: "Getting good with money is about having more options, not about living with less.",
      },
    ],
  },
  {
    slug: "start-with-goals",
    title: "Money starts with goals",
    blocks: [
      {
        kind: "text",
        text: "Before any numbers, decide what you want your money to do for you. A goal turns saving from a chore into something you can see.",
      },
      {
        kind: "list",
        items: [
          "Three months of bills set aside for surprises.",
          "A credit card paid off for good.",
          "A down payment on a home.",
        ],
      },
    ],
  },
  {
    slug: "where-money-goes",
    title: "Where your money goes",
    blocks: [
      {
        kind: "text",
        text: "Every month, [[income|income]] comes in and [[expenses|expenses]] go out.",
      },
      { kind: "diagram", diagram: "money-in-and-out" },
      {
        kind: "text",
        text: "For most people, almost everything that comes in goes right back out.",
      },
    ],
  },
  {
    slug: "what-you-own-and-owe",
    title: "What you own and what you owe",
    blocks: [
      {
        kind: "text",
        text: "Make two lists: what you own, and what you owe. Own minus owe is your [[net worth|net-worth]].",
      },
      { kind: "diagram", diagram: "own-and-owe" },
      {
        kind: "text",
        text: "For a lot of people, the owe list is the longer one. That's the situation, and there's a way out.",
      },
    ],
  },
  {
    slug: "the-work-and-spend-loop",
    title: "The loop most people are in",
    blocks: [
      { kind: "diagram", diagram: "work-and-spend-loop" },
      {
        kind: "text",
        text: "Each paycheck gets spent, so the loop starts again. The way out is to have some of your money working for you.",
      },
    ],
  },
  {
    slug: "the-lazy-way-out",
    title: "The lazy way out",
    blocks: [
      {
        kind: "text",
        text: "The easiest way out of the loop doesn't take a second job. It takes time, and money you leave alone.",
      },
      {
        kind: "text",
        text: "Invested money earns a [[return|return]]. Then that return earns a return too. That's [[compound growth|compound-growth]], and the next three steps show what it does.",
      },
    ],
  },
  {
    slug: "starting-at-35",
    title: "Starting at 35",
    blocks: [
      {
        kind: "text",
        text: "Say you put $1,000 a year into an account that grows about 8% a year, every year from 35 to 65.",
      },
      {
        kind: "growth",
        deposit: 1000,
        frequency: "yearly",
        depositYears: 30,
        years: 30,
        yearlyReturn: 0.08,
        startAge: 35,
      },
    ],
  },
  {
    slug: "start-early-then-stop",
    title: "Start early, then stop",
    blocks: [
      {
        kind: "text",
        text: "This time, start at 25. Put in $1,000 a year for just 10 years, then stop adding and leave it alone until 65.",
      },
      {
        kind: "growth",
        deposit: 1000,
        frequency: "yearly",
        depositYears: 10,
        years: 40,
        yearlyReturn: 0.08,
        startAge: 25,
      },
      {
        kind: "text",
        text: "Less money in, more money out. Starting early beats putting in more.",
      },
    ],
  },
  {
    slug: "a-little-every-month",
    title: "A little every month",
    blocks: [
      {
        kind: "text",
        text: "Now put in $200 a month from 25 to 65, invested in the [[stock|stock]] market at 11% a year, close to what the [[S&P 500|s-and-p-500]] has averaged over the long run, before [[inflation|inflation]].",
      },
      {
        kind: "growth",
        deposit: 200,
        frequency: "monthly",
        depositYears: 40,
        years: 40,
        yearlyReturn: 0.11,
        startAge: 25,
      },
      { kind: "link", slug: "compound-growth", label: "Try your own numbers" },
    ],
  },
  {
    slug: "the-way-out",
    title: "The way out",
    blocks: [
      { kind: "diagram", diagram: "money-works-loop" },
      {
        kind: "text",
        text: "Same days, different loop: spend less than you earn, and let the rest keep growing.",
      },
    ],
  },
  {
    slug: "what-puts-money-in-your-pocket",
    title: "What puts money in your pocket",
    blocks: [
      { kind: "diagram", diagram: "cash-flow" },
      {
        kind: "text",
        text: "Some things you own pay you, like savings and investments. Others cost you every month, like a car loan. Collect more of the first kind.",
      },
      {
        kind: "text",
        text: "This picture comes from the book Rich Dad Poor Dad.",
      },
    ],
  },
  {
    slug: "where-to-begin",
    title: "Sounds too easy? Start here",
    blocks: [
      {
        kind: "list",
        items: [
          "Think like an investor, not just a spender.",
          "Make a budget, so you know where your money goes.",
          "Pay yourself first, so saving happens before spending.",
        ],
      },
      {
        kind: "text",
        text: "Then build an [[emergency fund|emergency-fund]] for surprises, and invest the rest for the long run.",
      },
    ],
  },
  {
    slug: "know-where-it-goes",
    title: "Know where it goes",
    blocks: [
      {
        kind: "text",
        text: "A [[budget|budget]] is a plan for each dollar, made before you spend it.",
      },
      { kind: "diagram", diagram: "where-pay-goes" },
      {
        kind: "text",
        text: "People who build wealth usually know exactly where their money goes. That's most of the secret.",
      },
    ],
  },
  {
    slug: "pay-yourself-first",
    title: "Pay yourself first",
    blocks: [
      { kind: "diagram", diagram: "pay-yourself-first" },
      {
        kind: "text",
        text: "Most people pay their bills first and save what's left, which is often nothing. [[Pay yourself first|pay-yourself-first]]: move money to savings the day you're paid, then live on the rest.",
      },
    ],
  },
  {
    slug: "where-to-next",
    title: "Where to next",
    blocks: [
      {
        kind: "text",
        text: "That's the whole talk. Pick a topic to go deeper, or come back to any step whenever you like.",
      },
      { kind: "topics" },
    ],
  },
];

const WORD_MARK = /\[\[([^|\]]+)\|([a-z0-9-]+)\]\]/g;

// The glossary slugs a text block marks.
export function wordMarks(text: string): string[] {
  return [...text.matchAll(WORD_MARK)].map((match) => match[2] ?? "");
}

// A text block split into plain runs and marked words, for rendering.
// Every mark's slug is a glossary word: tests/content/steps.test.ts checks them against WORDS.
export function textParts(
  text: string,
): ({ text: string } | { text: string; word: WordSlug })[] {
  const parts: ({ text: string } | { text: string; word: WordSlug })[] = [];
  let last = 0;
  for (const match of text.matchAll(WORD_MARK)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ text: match[1] ?? "", word: (match[2] ?? "") as WordSlug });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
