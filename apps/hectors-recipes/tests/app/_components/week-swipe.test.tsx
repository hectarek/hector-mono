import { beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { WeekSwipe } from "@/app/_components/week-swipe";
import { nextState, resetNextState } from "@/tests/_support/next";

const touch = (x: number, y: number) => ({ clientX: x, clientY: y });

// D51: a sideways swipe on the week goes where the arrows go.
describe("WeekSwipe", () => {
  beforeEach(() => {
    resetNextState();
  });

  const shown = (monday: string) => (
    <WeekSwipe
      week={monday}
      previousHref="/plan?week=before"
      nextHref="/plan?week=after"
    >
      <p>The week</p>
    </WeekSwipe>
  );

  const week = () => {
    const view = render(shown("2026-10-05"));
    const swipe = (from: [number, number], to: [number, number]) => {
      const target = view.getByText("The week");
      fireEvent.touchStart(target, { touches: [touch(...from)] });
      fireEvent.touchEnd(target, { changedTouches: [touch(...to)] });
    };
    return { view, swipe };
  };

  it("goes to the next week on a swipe left, and the one before on a swipe right", () => {
    const { swipe } = week();
    swipe([300, 200], [150, 210]);
    swipe([150, 200], [300, 190]);
    expect(nextState.pushed).toEqual(["/plan?week=after", "/plan?week=before"]);
  });

  it("stays put for a scroll, a swipe from the screen's edge, and a mouse drag", () => {
    const { view, swipe } = week();
    swipe([300, 200], [220, 400]);
    swipe([5, 200], [300, 200]);
    const target = view.getByText("The week");
    fireEvent.mouseDown(target, touch(300, 200));
    fireEvent.mouseUp(target, touch(100, 200));
    expect(nextState.pushed).toEqual([]);
  });

  // D54: a later week slides in from the right, an earlier one from the left, and the same
  // week shown again doesn't move.
  it("slides a new week in from the side it came from", () => {
    const slide = () => view.getByText("The week").parentElement?.className;
    const view = render(shown("2026-11-02"));

    view.rerender(shown("2026-11-09"));
    expect(slide()).toContain("slide-in-from-right");
    view.rerender(shown("2026-11-02"));
    expect(slide()).toContain("slide-in-from-left");
    view.rerender(shown("2026-11-02"));
    expect(slide()).not.toContain("animate-in");
  });
});
