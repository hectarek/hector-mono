import type { STEPS } from "@/src/content/steps";

type DiagramName = Extract<
  (typeof STEPS)[number]["blocks"][number],
  { kind: "diagram" }
>["diagram"];

// The talk's pictures, redrawn as boxes and words (R10): every label is real text, so a diagram
// reads without its colours, before the page's code loads, and to a screen reader.

function Box({
  title,
  items,
  strong = false,
}: {
  title: string;
  items?: readonly string[];
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "rounded-lg border bg-primary p-4 text-primary-foreground"
          : "rounded-lg border bg-card p-4"
      }
    >
      <p className="font-semibold">{title}</p>
      {items && (
        <ul className="mt-1 list-disc pl-5 text-base">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Down() {
  return (
    <p
      aria-hidden="true"
      className="text-center text-2xl text-muted-foreground"
    >
      ↓
    </p>
  );
}

function Loop({ steps, back }: { steps: readonly string[]; back: string }) {
  return (
    <div className="space-y-2">
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-3 rounded-lg border bg-card p-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground text-base">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="text-base text-muted-foreground">{back}</p>
    </div>
  );
}

function Flow({ label, order }: { label: string; order: readonly string[] }) {
  return (
    <div className="space-y-2">
      <p className="font-semibold">{label}</p>
      <ol className="flex flex-wrap items-center gap-2">
        {order.map((part, index) => (
          <li key={part} className="flex items-center gap-2">
            {index > 0 && (
              <span aria-hidden="true" className="text-muted-foreground">
                →
              </span>
            )}
            <span className="rounded-md border bg-card px-3 py-1 text-base">
              {part}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function StepDiagram({ diagram }: { diagram: DiagramName }) {
  switch (diagram) {
    case "money-in-and-out":
      return (
        <figure className="space-y-2">
          <Box title="Money in" items={["Your pay"]} strong />
          <Down />
          <Box
            title="Money out"
            items={[
              "Taxes",
              "Rent or a mortgage",
              "Car and student loans",
              "Credit card payments",
            ]}
          />
          <Down />
          <Box title="What's left" items={["Some cash, maybe"]} />
        </figure>
      );
    case "own-and-owe":
      return (
        <figure className="grid grid-cols-2 gap-3">
          <Box title="What you own" items={["Some cash"]} strong />
          <Box
            title="What you owe"
            items={["A mortgage", "Loans", "Credit card debt"]}
          />
        </figure>
      );
    case "work-and-spend-loop":
      return (
        <figure>
          <Loop
            steps={[
              "Wake up",
              "Go to work",
              "Work hard, make money",
              "Get home tired, spend what you earned",
            ]}
            back="Then back to 1, every day."
          />
        </figure>
      );
    case "money-works-loop":
      return (
        <figure>
          <Loop
            steps={[
              "Wake up",
              "Do what serves you",
              "Your money makes money",
              "Don't overspend, and your investments keep growing",
            ]}
            back="Then back to 1, a little further ahead each time."
          />
        </figure>
      );
    case "cash-flow":
      return (
        <figure className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Box
              title="Money in"
              items={["Your pay", "What pays you"]}
              strong
            />
            <Box title="Money out" items={["Bills", "What costs you"]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Box
              title="What pays you"
              items={["Savings", "Investments"]}
              strong
            />
            <Box
              title="What costs you"
              items={["A car loan", "Credit card debt"]}
            />
          </div>
          <figcaption className="text-base text-muted-foreground">
            What pays you adds to money in. What costs you adds to money out.
          </figcaption>
        </figure>
      );
    case "where-pay-goes":
      return (
        <figure>
          <Flow
            label="Your pay"
            order={["Bills", "Rent", "Going out", "Gifts"]}
          />
        </figure>
      );
    case "pay-yourself-first":
      return (
        <figure className="space-y-4">
          <Flow
            label="Most people"
            order={["Paycheck", "Bills", "Savings, if anything is left"]}
          />
          <Flow
            label="Pay yourself first"
            order={["Paycheck", "Savings", "Bills"]}
          />
        </figure>
      );
  }
}
