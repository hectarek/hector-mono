# The money math

How the calculators turn what people type into numbers, with worked examples. Every example here is a test in `tests/finance/`, so a change to the math that breaks one fails `bun test`. When a calculator and an example disagree, fix the math or the example from its source, never the test's tolerance (the plan's stop conditions).

The math is plain TypeScript in `src/finance/`, with no React. It stays unrounded; only what's shown is rounded, to whole dollars.

## Reading what people type (`parse.ts`)

One parser serves every field. It drops dollar signs, percent signs and spaces, and then a comma means one of two things, depending on the field:

- In a dollar field (and a years field), a comma separates thousands.
- In a percent field, a comma is a decimal point. A phone set to a language that writes 6,5 shows only a comma on its decimal keypad, so the field never has to guess.

Each row is a case in `tests/finance/parse.test.ts`:

| Field   | Typed                | Reads as                                               |
| ------- | -------------------- | ------------------------------------------------------ |
| Dollars | `$350,000`           | 350000                                                 |
| Dollars | `1,234`              | 1234                                                   |
| Percent | `6,5`                | 6.5                                                    |
| Percent | `6.5%`               | 6.5                                                    |
| Any     | (empty)              | missing, never 0                                       |
| Any     | `abc`, `1e3`, `0x10` | invalid: only plain digits and one decimal point count |

The ranges: an amount from $0 to $100,000,000, a rate from 0% to 25%, and from 0 to 80 years, in whole years. Outside them, the field's message names the range, such as "Enter a yearly return from 0% to 25%".

## Growth over time (`growth.ts`)

### The rule

Growth is added once a year (yearly compounding), with the intro talk's rule for deposits:

- A **yearly** deposit goes in at the start of each year, so it earns that year's whole return.
- A **monthly** deposit goes in at the end of each month and earns simple interest until the year ends: the deposit made at the end of month _m_ earns `rate × (12 − m) / 12`. Then the year's balance compounds.

So a year with monthly deposits ends at `balance × (1 + rate) + deposit × (12 + 5.5 × rate)`, since the twelve deposits' months of interest add up to 66 / 12 = 5.5.

The year-by-year loop never divides by the rate, so a 0% return needs no branch of its own: each year just adds the deposits.

Real accounts often compound monthly or daily. That gives more: $200 a month for 40 years at 11%, compounded monthly, comes to about $1,720,025, against $1,466,784 here. The page states its rule (R17).

### Worked examples

**Example 1: $1,000 a year for 30 years at 8%, from nothing.** The intro talk's first slide.

- Each deposit goes in at the start of the year, so this is an annuity due: `1,000 × ((1.08^30 − 1) / 0.08) × 1.08`.
- 1.08^30 = 10.0627, so `1,000 × 113.2832 × 1.08` = **$122,345.87**, to the cent.

**Example 2: $1,000 a year for 10 years at 8%, then no deposits until year 40.** The talk's second slide.

- After 10 years: `1,000 × ((1.08^10 − 1) / 0.08) × 1.08` = $15,645.49.
- Then 30 years with no deposits: `15,645.49 × 1.08^30` = **$157,435.17**, to the cent. Ten years of deposits beat Example 1's thirty.

**Example 3: $200 a month for 40 years at 11%.** The talk's third slide.

- Each year adds `200 × (12 + 5.5 × 0.11)` = $2,521 at its end, so this is an ordinary annuity of $2,521: `2,521 × ((1.11^40 − 1) / 0.11)`.
- 1.11^40 = 65.0009, so `2,521 × 581.8264` = **$1,466,783.51**. The slide shows $1,466,758, $25.51 less (the plan's H5 records it).

**Example 4: $100 a month for 10 years at 0%.** No return: 120 deposits of $100 come to exactly **$12,000**, with no NaN.

**Example 5: 0 years.** Nothing has time to grow, so the total is the starting amount: $5,000 in, $5,000 out.

**Example 6: the page's example.** $200 a month for 30 years at 7%, from $0 (the example values in `assumptions.ts`, each a starting guess). It comes to **$233,979.37**, from $72,000 put in. In today's dollars, at 3% inflation, that's $96,396 from $47,684 put in.

### Today's dollars

Inflation means a dollar buys less each year. "Today's dollars" shows a future amount as what it would buy now:

- Each year's total is divided by `(1 + inflation)^year`.
- What you put in counts each deposit at what it was worth when it went in: a deposit made at time _t_ (in years) is divided by `(1 + inflation)^t`. A yearly deposit at the start of year _y_ goes in at _t_ = _y_ − 1. A monthly deposit at the end of month _m_ of year _y_ goes in at _t_ = (_y_ − 1) + _m_ / 12. The starting amount goes in at _t_ = 0.
- Deposits stay flat: the same number of dollars every time.

**Example 7: $1,000 a year for 30 years, at the start of each year, with 3% inflation.** What you put in, in today's dollars: `1,000 × (1 − 1.03^−30) / (1 − 1 / 1.03)` = **$20,188.45**, against $30,000 in dollars as they'll be.

**Example 8: $100 a month for 10 years at 0%, with 3% inflation.** The total is `12,000 / 1.03^10` = **$8,929.13** in today's dollars, below the $10,376.24 put in. That's what inflation does to money that doesn't grow, and the sentence says so: "…less than the $10,376 you put in, because inflation makes each dollar buy less."

## Showing numbers (`format.ts`)

Money shows in whole dollars. A shown amount is never NaN, infinity or −$0.

A result's parts are rounded together so they add up to the rounded total, by the largest remainder: round the total, round every part down, then give the dollars left over to the parts with the largest remainders (`allocateRounded`).

**Example 9: parts of $1,210.45, $300.40 and $99.30.** The total, $1,610.15, rounds to $1,610. Rounded down, the parts are $1,210, $300 and $99, which is $1,609. The one dollar left goes to the largest remainder, 0.45, so the parts show as **$1,211, $300 and $99**, which add up to $1,610. Rounding each part on its own would show $1,210 + $300 + $99 = $1,609 beside a total of $1,610.
