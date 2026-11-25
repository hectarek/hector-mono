import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

// A numbered list of steps in a chipboard panel (A9, A6): a bone circle with the number in mono,
// the step's words, a dashed line between steps. Each step has a name of its own for a key. With
// `top`, a step of several lines hangs from its circle, as C11 draws it.
export function Steps({
  steps,
  top = false,
}: {
  steps: readonly { id: string; text: ReactNode }[];
  top?: boolean;
}) {
  return (
    <ol className="flex flex-col rounded-lg border-2 border-foreground bg-card *:border-dashed *:border-foreground *:not-first:border-t-2">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={cn(
            "flex gap-3 px-3 py-3.5",
            top ? "items-start" : "items-center",
          )}
        >
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-secondary font-mono text-13 font-medium"
          >
            {index + 1}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 text-15 leading-snug font-semibold",
              top && "pt-0.75",
            )}
          >
            {step.text}
          </span>
        </li>
      ))}
    </ol>
  );
}
