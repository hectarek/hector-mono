type Topic = {
  slug: string;
  name: string;
  line: string;
};

// The site's topics, in the order the home page shows them. A topic's slug is its link
// (/housing), so it never changes once a link has been sent.
export const TOPICS = [
  {
    slug: "basics",
    name: "Money basics",
    line: "What you own, what you owe, and where your money goes.",
  },
  {
    slug: "saving",
    name: "Saving",
    line: "Paying yourself first, and building a cushion for surprises.",
  },
  {
    slug: "investing",
    name: "Investing",
    line: "How money grows when you put it to work and leave it alone.",
  },
  {
    slug: "housing",
    name: "Housing",
    line: "What a home really costs, and when renting comes out ahead.",
  },
  {
    slug: "credit",
    name: "Credit and debt",
    line: "Credit cards, loans, and what borrowing really costs.",
  },
  {
    slug: "taxes",
    name: "Taxes",
    line: "What comes out of your paycheck, and the forms you'll see.",
  },
] as const satisfies readonly Topic[];

export type TopicSlug = (typeof TOPICS)[number]["slug"];
