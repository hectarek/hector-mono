type WordEntry = { word: string; definition: string };

// Every money word the site uses, one plain definition each (R19). A page marks a word's first
// use with <Word slug="…">, so a slug missing here fails the typecheck. Hector reviews the
// definitions before they ship (H6). "asset" and "liability" wait on his call about which
// meaning the site teaches: what you own and owe, or the talk's "what puts money in your pocket".
export const WORDS = {
  amortization: {
    word: "Amortization",
    definition:
      "How a loan gets paid down over time. Early payments go mostly to interest, and later ones go mostly to the loan itself.",
  },
  asset: {
    word: "Asset",
    definition: "Something you own that's worth money, like savings or a home.",
  },
  budget: {
    word: "Budget",
    definition:
      "A plan for where each dollar of your pay will go, made before you spend it.",
  },
  "closing-costs": {
    word: "Closing costs",
    definition:
      "Fees you pay when you buy a home, on top of the down payment. They're often 2% to 5% of the price.",
  },
  "compound-growth": {
    word: "Compound growth",
    definition:
      "Growth on top of growth: your money earns a return, and then that return earns a return too.",
  },
  "down-payment": {
    word: "Down payment",
    definition:
      "The part of a home's price you pay up front. The rest is the loan.",
  },
  "emergency-fund": {
    word: "Emergency fund",
    definition:
      "Money set aside for surprises, like a car repair or a lost job, so you don't have to borrow.",
  },
  equity: {
    word: "Equity",
    definition:
      "The part of your home you own outright: what it's worth, minus what you still owe on it.",
  },
  expenses: {
    word: "Expenses",
    definition: "Everything you spend money on, from rent and bills to fun.",
  },
  hoa: {
    word: "HOA",
    definition:
      "A homeowners association, which runs a neighborhood or building and charges owners a fee, usually monthly.",
  },
  "homeowners-insurance": {
    word: "Homeowners insurance",
    definition:
      "Insurance that pays to repair or rebuild your home after damage like a fire or a storm. Lenders require it.",
  },
  income: {
    word: "Income",
    definition: "Money coming in, like your pay.",
  },
  inflation: {
    word: "Inflation",
    definition:
      "Prices rising over time, so the same dollar buys a little less each year.",
  },
  interest: {
    word: "Interest",
    definition:
      "The price of borrowing money, or what you earn for lending it. It's usually a percent of the amount, per year.",
  },
  liability: {
    word: "Liability",
    definition: "Something you owe, like a loan or credit card debt.",
  },
  mortgage: {
    word: "Mortgage",
    definition:
      "A loan to buy a home. The home backs the loan, so the lender can take it if the payments stop.",
  },
  "net-worth": {
    word: "Net worth",
    definition: "What you own, minus what you owe.",
  },
  "pay-yourself-first": {
    word: "Pay yourself first",
    definition:
      "Moving money into savings as soon as you're paid, before you pay bills or spend.",
  },
  pmi: {
    word: "PMI",
    definition:
      "Private mortgage insurance: a monthly charge most lenders add when your down payment is under 20% of the price. It protects the lender, and it ends once you've paid down enough of the loan.",
  },
  principal: {
    word: "Principal",
    definition:
      "The amount you borrowed, not counting interest. Each payment pays down some of it.",
  },
  "property-tax": {
    word: "Property tax",
    definition:
      "A yearly tax on a home, set by your county or city as a percent of the home's value.",
  },
  return: {
    word: "Return",
    definition:
      "What your money earns in a year, as a percent. A 7% return turns $100 into $107.",
  },
  "s-and-p-500": {
    word: "S&P 500",
    definition:
      "A list of 500 large US companies. How their stocks do together is a common measure of the stock market.",
  },
  stock: {
    word: "Stock",
    definition:
      "A small share of a company. If the company grows, your share can be worth more.",
  },
  "todays-dollars": {
    word: "Today's dollars",
    definition:
      "Future amounts shrunk by inflation, so you can compare them with what money buys now.",
  },
} as const satisfies Record<string, WordEntry>;

export type WordSlug = keyof typeof WORDS;

export function wordsInOrder(): { slug: WordSlug; entry: WordEntry }[] {
  return (Object.keys(WORDS) as WordSlug[])
    .map((slug) => ({ slug, entry: WORDS[slug] }))
    .sort((a, b) => a.entry.word.localeCompare(b.entry.word));
}
