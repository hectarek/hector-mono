import Link from "next/link";
import { TopicTile } from "@/app/_components/topic-tile";
import { Word } from "@/app/_components/word";
import { STEPS, textParts } from "@/src/content/steps";
import { TOPICS } from "@/src/content/topics";
import { StepDiagram } from "./diagrams";
import { GrowthExample } from "./growth-example";
import { StepShell } from "./step-shell";

type Step = (typeof STEPS)[number];

// The first step lives at /start, the rest at /start/<slug> (KTD11).
export function stepPath(index: number): `/${string}` {
  const step = STEPS[index];
  return index === 0 || !step ? "/start" : `/start/${step.slug}`;
}

function Text({ text }: { text: string }) {
  return (
    <p>
      {textParts(text).map((part) =>
        "word" in part ? (
          <Word key={part.word} slug={part.word}>
            {part.text}
          </Word>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}

function Block({ step, block }: { step: Step; block: Step["blocks"][number] }) {
  switch (block.kind) {
    case "text":
      return <Text text={block.text} />;
    case "list":
      return (
        <ul className="list-disc space-y-2 pl-6">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "diagram":
      return <StepDiagram diagram={block.diagram} />;
    case "growth":
      return (
        <GrowthExample
          id={step.slug}
          deposit={block.deposit}
          frequency={block.frequency}
          depositYears={block.depositYears}
          years={block.years}
          yearlyReturn={block.yearlyReturn}
          startAge={block.startAge}
        />
      );
    case "link":
      return (
        <Link
          href={`/${block.slug}`}
          className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
        >
          {block.label}
        </Link>
      );
    case "topics":
      return (
        <ul className="grid gap-3 sm:grid-cols-2">
          {TOPICS.map((topic) => (
            <li key={topic.slug}>
              <TopicTile topic={topic} />
            </li>
          ))}
        </ul>
      );
  }
}

// A block's content names it: no two blocks in a step are the same.
function blockKey(block: Step["blocks"][number]): string {
  switch (block.kind) {
    case "text":
      return block.text;
    case "list":
      return block.items.join("|");
    case "diagram":
      return block.diagram;
    case "growth":
      return `growth-${block.frequency}-${block.deposit}`;
    case "link":
      return block.slug;
    case "topics":
      return "topics";
  }
}

// One step of the walkthrough: its place in the talk, its title, its blocks, and Back and Next.
export function StepView({ index }: { index: number }) {
  const step = STEPS[index];
  if (!step) return null;
  const previous = index > 0 ? stepPath(index - 1) : null;
  const nextStep = STEPS[index + 1];
  const next = nextStep ? stepPath(index + 1) : null;

  return (
    <StepShell previous={previous} next={next}>
      <article className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex min-h-11 items-center justify-between gap-4">
          {previous ? (
            <Link
              href={previous}
              className="inline-flex min-h-11 items-center font-semibold"
            >
              Back
            </Link>
          ) : (
            <span />
          )}
          <p className="text-base text-muted-foreground">
            Step {index + 1} of {STEPS.length}
          </p>
        </div>
        <h1 data-step-heading tabIndex={-1} className="font-semibold text-3xl">
          {step.title}
        </h1>
        {step.blocks.map((block) => (
          <Block key={blockKey(block)} step={step} block={block} />
        ))}
        {nextStep && next && (
          <Link
            href={next}
            className="flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-center font-semibold text-primary-foreground"
          >
            Next: {nextStep.title}
          </Link>
        )}
      </article>
    </StepShell>
  );
}
