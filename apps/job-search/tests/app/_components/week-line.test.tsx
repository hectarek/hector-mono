import { describe, expect, it } from "bun:test";
import { render, within } from "@testing-library/react";
import { WeekLine } from "@/app/_components/week-line";

// Each fact's label and value, as the line reads them.
const factsOf = (line: HTMLElement) =>
  [...line.querySelectorAll("dt")].map(
    (term) => `${term.textContent} ${term.nextElementSibling?.textContent}`,
  );

describe("the week's line on Today", () => {
  // R9 as revised 2026-11-10: applications against the target, and blocks done against planned.
  it("shows the week's applications against the target, and its blocks done of those planned", () => {
    const view = render(
      <WeekLine applications={2} target={5} blocks={{ done: 3, planned: 8 }} />,
    );

    expect(factsOf(view.getByRole("region", { name: "This week" }))).toEqual([
      "Applications 2/5",
      "Blocks done 3/8",
    ]);
  });

  it("shows the applications alone where there's no target, and leaves blocks out while none are planned", () => {
    const view = render(
      <WeekLine
        applications={1}
        target={null}
        blocks={{ done: 0, planned: 0 }}
      />,
    );

    const line = view.getByRole("region", { name: "This week" });
    expect(factsOf(line)).toEqual(["Applications 1"]);
    expect(within(line).queryByText("Blocks done")).toBeNull();
  });
});
