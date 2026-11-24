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

// U26's piece hop: on a loan's page, a day passing while it shows hops the piece onto today.
describe("Track's piece hop", () => {
  const borrower = { shape: "pawn", color: "mustard" } as const;
  const days = (...labels: string[]) =>
    labels.map((label, index) => ({
      label,
      due: index === labels.length - 1,
    }));
  const pieceSpace = (view: ReturnType<typeof render>) =>
    view.container.firstElementChild?.children[0]?.children[0] as HTMLElement;

  it("hops the piece onto today's space when the day moves on", () => {
    const view = render(
      <Track
        spaces={days("TUE", "WED", "THU", "FRI")}
        today={0}
        borrower={borrower}
        day="2026-11-24"
      />,
    );
    expect(pieceSpace(view).dataset.moment).toBeUndefined();

    view.rerender(
      <Track
        spaces={days("WED", "THU", "FRI")}
        today={0}
        borrower={borrower}
        day="2026-11-25"
      />,
    );
    expect(pieceSpace(view).dataset.moment).toBe("hop");
    expect(pieceSpace(view).querySelector("svg")).toBeTruthy();
  });

  it("keeps still without its day, as on the list of loans", () => {
    const view = render(
      <Track spaces={days("TUE", "WED")} today={0} borrower={borrower} />,
    );
    view.rerender(<Track spaces={days("WED")} today={0} borrower={borrower} />);
    expect(pieceSpace(view).dataset.moment).toBeUndefined();
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
