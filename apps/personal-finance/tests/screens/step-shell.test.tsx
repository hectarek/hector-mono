import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

// The links StepShell asks the router for, in order.
const pushed: string[] = [];
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: (to: string) => pushed.push(to) }),
}));

const { StepShell } = await import("@/app/_components/walkthrough/step-shell");

function Step() {
  return (
    <StepShell previous="/start/step-one" next="/start/step-three">
      <h1 data-step-heading tabIndex={-1}>
        Step two
      </h1>
      <label htmlFor="deposit">Each year you put in</label>
      <input id="deposit" />
      <div data-swipe-ignore>The growth example</div>
      <p>An idea, in plain words.</p>
    </StepShell>
  );
}

function swipe(from: Element, startX: number, endX: number): void {
  fireEvent.touchStart(from, { touches: [{ clientX: startX, clientY: 300 }] });
  fireEvent.touchEnd(from, {
    changedTouches: [{ clientX: endX, clientY: 305 }],
  });
}

describe("a walkthrough step's gestures", () => {
  // First in the file: the flag it checks is set by the first step a reader sees.
  it("leaves focus where it is on the first step, and moves it to the heading on the next", () => {
    const first = render(<Step />);
    expect(document.activeElement).not.toBe(
      screen.getByRole("heading", { name: "Step two" }),
    );
    first.unmount();

    render(<Step />);
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Step two" }),
    );
  });

  it("moves a step with the arrow keys, but not from inside a field or with a modifier", () => {
    pushed.length = 0;
    render(<Step />);
    fireEvent.keyDown(document, { key: "ArrowRight" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(screen.getByLabelText("Each year you put in"), {
      key: "ArrowRight",
    });
    fireEvent.keyDown(document, { key: "ArrowRight", metaKey: true });
    expect(pushed).toEqual(["/start/step-three", "/start/step-one"]);
  });

  it("moves a step with a sideways swipe, but not one that starts on a field or the growth example", () => {
    pushed.length = 0;
    render(<Step />);
    swipe(screen.getByText("An idea, in plain words."), 600, 300);
    swipe(screen.getByText("An idea, in plain words."), 300, 600);
    swipe(screen.getByLabelText("Each year you put in"), 600, 300);
    swipe(screen.getByText("The growth example"), 600, 300);
    expect(pushed).toEqual(["/start/step-three", "/start/step-one"]);
  });
});
