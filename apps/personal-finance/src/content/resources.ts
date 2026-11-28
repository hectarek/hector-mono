import { TOPICS, type TopicSlug } from "./topics";

type Resource = {
  title: string;
  by: string;
  // Hector's line on why it's worth the time. Hector reviews these before they ship (H6).
  note: string;
  topics: readonly TopicSlug[];
  // null for a book. `checked` is the day someone last opened the link, or null until someone has.
  link: { url: string; checked: string | null } | null;
  caveat: string | null;
};

const KHAN =
  "https://www.khanacademy.org/college-careers-more/financial-literacy";
const KHAN_CHECKED = "2026-11-28";

function khanUnit(
  title: string,
  unit: string,
  topics: readonly TopicSlug[],
  note: string,
): Resource {
  return {
    title,
    by: "Khan Academy",
    note,
    topics,
    link: { url: `${KHAN}/xa6995ea67a8e9fdd:${unit}`, checked: KHAN_CHECKED },
    caveat: null,
  };
}

// The outside material Hector points people to. Khan Academy's lessons are linked, never
// copied: its content is licensed for non-commercial reuse only (D3).
export const RESOURCES: readonly Resource[] = [
  {
    title: "Financial Literacy",
    by: "Khan Academy",
    note: "A free course that covers it all, in short videos and quizzes. Start anywhere.",
    topics: ["basics"],
    link: { url: KHAN, checked: KHAN_CHECKED },
    caveat: null,
  },
  khanUnit(
    "Financial goals",
    "financial-goals",
    ["basics"],
    "Setting money goals, and working out what you're worth on paper.",
  ),
  khanUnit(
    "Budgeting and saving",
    "budgeting-and-saving",
    ["saving"],
    "How to build a budget and find money to save.",
  ),
  khanUnit(
    "Banking",
    "banking",
    ["saving"],
    "Checking, savings, and how to pick a bank.",
  ),
  khanUnit(
    "Investments and retirement",
    "investments-retirement",
    ["investing"],
    "Retirement accounts, the basics of investing, and how money grows.",
  ),
  khanUnit(
    "Housing",
    "housing24",
    ["housing"],
    "Renting, buying, and what to look for in each.",
  ),
  khanUnit(
    "Consumer credit",
    "consumer-credit",
    ["credit"],
    "How credit cards and credit scores work.",
  ),
  khanUnit(
    "Loans and debt",
    "loans-and-debt",
    ["credit"],
    "Borrowing, interest, and getting out of debt.",
  ),
  khanUnit(
    "Taxes and tax forms",
    "taxes-and-tax-forms",
    ["taxes"],
    "What comes out of your pay, and the forms you'll fill in.",
  ),
  {
    title: "Is It Better to Rent or Buy?",
    by: "The New York Times",
    note: "A detailed rent-or-buy calculator, for when you want to change every assumption.",
    topics: ["housing"],
    link: {
      url: "https://www.nytimes.com/interactive/2024/upshot/buy-rent-calculator.html",
      checked: null,
    },
    caveat: "May ask you to subscribe.",
  },
  {
    title: "Mortgage Calculator",
    by: "mortgagecalculator.org",
    note: "Every number of a mortgage, down to a table of each month's payment.",
    topics: ["housing"],
    link: { url: "https://www.mortgagecalculator.org/", checked: "2026-11-28" },
    caveat: null,
  },
  {
    title: "Loan Estimate explainer",
    by: "Consumer Financial Protection Bureau",
    note: "Walks through the form a lender gives you, line by line. Its numbers are the real ones.",
    topics: ["housing"],
    link: {
      url: "https://www.consumerfinance.gov/owning-a-home/loan-estimate/",
      checked: "2026-11-28",
    },
    caveat: null,
  },
  {
    title: "Compound Interest Calculator",
    by: "Investor.gov, from the SEC",
    note: "The government's own growth calculator, with a range of returns to compare.",
    topics: ["investing"],
    link: {
      url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator",
      checked: "2026-11-28",
    },
    caveat: null,
  },
  {
    title: "The Psychology of Money",
    by: "Morgan Housel",
    note: "Why money is more about how we behave than about math.",
    topics: ["basics"],
    link: null,
    caveat: null,
  },
  {
    title: "Rich Dad Poor Dad",
    by: "Robert Kiyosaki",
    note: "Where the talk's picture of money flowing in and out comes from.",
    topics: ["basics"],
    link: null,
    caveat: null,
  },
  {
    title: "Get Good with Money",
    by: "Tiffany Aliche",
    note: "Ten practical steps, starting with a budget you can keep.",
    topics: ["saving"],
    link: null,
    caveat: null,
  },
];

type ResourceGroup = {
  topic: (typeof TOPICS)[number];
  resources: readonly Resource[];
};

// The resources page's groups: every topic that has resources, in the topics' order.
export function resourcesByTopic(): ResourceGroup[] {
  return TOPICS.map((topic) => ({
    topic,
    resources: RESOURCES.filter((r) => r.topics.includes(topic.slug)),
  })).filter((group) => group.resources.length > 0);
}
