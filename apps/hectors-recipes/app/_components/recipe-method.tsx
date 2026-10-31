import { InlineMarkdown } from "@/app/_components/markdown";
import type { RecipeStep } from "@/src/entities/models/recipe-step.model";
import { stepGroups } from "@/src/entities/step-text";

// A recipe's steps, numbered on through their sections (D35), at reading size.
export function RecipeMethod({
  steps,
}: {
  steps: Pick<RecipeStep, "position" | "text" | "section">[];
}) {
  if (steps.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl">Method</h2>
      {stepGroups(steps).map((group) => (
        <div key={group.first} className="flex flex-col gap-3">
          {group.section && (
            <h3 className="text-muted-foreground mt-3 text-xs font-semibold tracking-wide uppercase">
              {group.section}
            </h3>
          )}
          <ol
            start={group.first}
            className="marker:font-heading marker:text-primary flex list-decimal flex-col gap-3 pl-7 text-lg marker:text-xl"
          >
            {group.steps.map((step) => (
              <li key={step.position} className="pl-1 leading-relaxed">
                <InlineMarkdown>{step.text}</InlineMarkdown>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
