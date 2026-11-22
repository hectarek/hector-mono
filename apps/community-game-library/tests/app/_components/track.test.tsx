import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { Group } from "@/app/_components/group";
import { Track } from "@/app/_components/track";

// D13: a loan is a track, the borrower's piece on today, the due day red.
describe("Track", () => {
  it("stands the borrower's piece on today and reds the due space", () => {
    const view = render(
      <Track
        spaces={[
          { label: "TUE" },
          { label: "WED" },
          { label: "THU" },
          { label: "FRI", due: true },
        ]}
        today={0}
        borrower={{ shape: "pawn", color: "mustard" }}
      />,
    );
    const [pieces, spaces, under] = [
      ...(view.container.firstElementChild?.children ?? []),
    ];
    expect(
      pieces?.children[0]
        ?.querySelector("[data-color]")
        ?.getAttribute("data-color"),
    ).toBe("mustard");
    expect(pieces?.querySelectorAll("svg")).toHaveLength(1);
    expect(
      [...(spaces?.children ?? [])].map((space) => space.textContent),
    ).toEqual(["TUE", "WED", "THU", "FRI"]);
    expect(spaces?.children[3]?.className).toContain("bg-destructive");
    expect(under?.children[0]?.textContent).toBe("today");
  });

  it("adds a dashed red space past the due day when late, the piece on it", () => {
    const view = render(
      <Track
        spaces={[
          { label: "SAT" },
          { label: "SUN" },
          { label: "MON", due: true },
          { label: "+1", late: true },
        ]}
        today={3}
        borrower={{ shape: "cone", color: "plum" }}
      />,
    );
    const [pieces, spaces, under] = [
      ...(view.container.firstElementChild?.children ?? []),
    ];
    expect(spaces?.children[3]?.className).toContain("border-dashed");
    expect(pieces?.children[3]?.querySelector("svg")).toBeTruthy();
    expect(under?.children[3]?.textContent).toBe("today");
  });
});

// The design system's Group: a panel with a red label inside, or a navy label over a list.
describe("Group", () => {
  it("labels a panel inside it, and a list from above", () => {
    const view = render(
      <>
        <Group label="The facts">
          <p>45–60 min</p>
        </Group>
        <Group label="Expansions" overList>
          <ul />
        </Group>
      </>,
    );
    const [facts, expansions] = view.getAllByRole("heading", { level: 2 });
    expect(facts?.textContent).toBe("The facts");
    expect(facts?.className).toContain("text-destructive");
    expect(expansions?.textContent).toBe("Expansions");
    expect(expansions?.className).not.toContain("text-destructive");
  });
});
