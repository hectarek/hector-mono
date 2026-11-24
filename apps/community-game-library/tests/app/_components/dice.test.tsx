import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { Dice, DicePair } from "@/app/_components/dice";

const faces = (container: HTMLElement) =>
  [...container.querySelectorAll("svg, span > span")].map((face) =>
    face.tagName.toLowerCase() === "svg"
      ? `${face.querySelectorAll("circle").length}${face.querySelector("rect")?.getAttribute("class")?.includes("fill-foreground") ? " best" : ""}`
      : `token ${face.textContent}${face.className.includes("bg-foreground") ? " best" : ""}`,
  );

// D13: dice are a player count, the best count inked, a numbered token past six.
describe("Dice", () => {
  it("shows a die for each count a game plays at, its best inked", () => {
    const view = render(<Dice min={2} max={5} best={4} />);
    expect(faces(view.container)).toEqual(["2", "3", "4 best", "5"]);
  });

  it("goes on in numbered tokens past six", () => {
    const view = render(<Dice min={5} max={8} best={7} />);
    expect(faces(view.container)).toEqual([
      "5",
      "6",
      "token 7 best",
      "token 8",
    ]);
  });

  // screens.md rule 14: show only what a game has.
  it("inks nothing without a best count, and draws nothing without counts", () => {
    expect(faces(render(<Dice min={2} max={2} />).container)).toEqual(["2"]);
    expect(render(<Dice />).container.innerHTML).toBe("");
  });

  it("tilts a pair for a suggestion, chipboard on a bone box", () => {
    const view = render(<DicePair onBone />);
    const dice = [...view.container.querySelectorAll("svg")];
    expect(dice).toHaveLength(2);
    expect(dice[0]?.parentElement?.className).toBe("-rotate-10");
    expect(dice[1]?.parentElement?.className).toBe("rotate-8");
    expect(dice[0]?.querySelector("rect")?.getAttribute("class")).toContain(
      "fill-card",
    );
  });

  // U26's dice tumble: asked again, each die turns through two faces and stops on its own.
  it("stacks each die's three faces while it tumbles, its own last", () => {
    const view = render(<DicePair tumbling />);
    const pair = view.container.firstElementChild as HTMLElement;
    expect(pair.dataset.moment).toBe("tumble");
    const stacks = [...pair.children];
    expect(stacks.map((stack) => stack.children.length)).toEqual([3, 3]);
    expect(
      stacks.map(
        (stack) => stack.lastElementChild?.querySelectorAll("circle").length,
      ),
    ).toEqual([5, 3]);
    expect(stacks[0]?.className).toContain("-rotate-10");

    const resting = render(<DicePair />).container.firstElementChild;
    expect((resting as HTMLElement).dataset.moment).toBeUndefined();
  });
});
