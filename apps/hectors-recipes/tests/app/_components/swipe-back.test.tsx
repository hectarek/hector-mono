import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { BackLink } from "@/app/_components/back-link";
import { nextState, resetNextState } from "@/tests/_support/next";

const touch = (x: number, y: number) => ({ clientX: x, clientY: y });

// D105: a swipe right on a page with a back link goes back to the previous page, or where
// the back link goes when the app has no earlier page.
describe("SwipeBack", () => {
  beforeEach(() => {
    resetNextState();
  });
  afterEach(() => {
    Reflect.deleteProperty(window, "navigation");
  });

  const earlierPage = (canGoBack: boolean) =>
    Object.defineProperty(window, "navigation", {
      value: { canGoBack },
      configurable: true,
    });

  const swipe = (
    target: Element,
    from: [number, number],
    to: [number, number],
  ) => {
    fireEvent.touchStart(target, { touches: [touch(...from)] });
    fireEvent.touchEnd(target, { changedTouches: [touch(...to)] });
  };

  it("goes back to the previous page on a swipe right", () => {
    earlierPage(true);
    const view = render(
      <main>
        <BackLink href="/" label="Recipes" />
        <p>The recipe</p>
      </main>,
    );
    swipe(view.getByText("The recipe"), [100, 300], [300, 310]);
    expect(nextState.wentBack).toBe(1);
    expect(nextState.pushed).toEqual([]);
  });

  it("goes where the back link goes when there's no earlier page", () => {
    earlierPage(false);
    const view = render(
      <main>
        <BackLink href="/?book=b1" label="Soups" />
        <p>The recipe</p>
      </main>,
    );
    swipe(view.getByText("The recipe"), [100, 300], [300, 300]);
    expect(nextState.pushed).toEqual(["/?book=b1"]);
    expect(nextState.wentBack).toBe(0);
  });

  it("stays put for a swipe left, a scroll, and a swipe in an open sheet", () => {
    earlierPage(true);
    const view = render(
      <main>
        <BackLink href="/" label="Recipes" />
        <p>The recipe</p>
        <div role="dialog">
          <p>A sheet</p>
        </div>
      </main>,
    );
    swipe(view.getByText("The recipe"), [300, 300], [100, 300]);
    swipe(view.getByText("The recipe"), [100, 300], [180, 500]);
    swipe(view.getByText("A sheet"), [100, 300], [300, 300]);
    expect(nextState.wentBack).toBe(0);
    expect(nextState.pushed).toEqual([]);
  });

  it("stops listening once the page goes", () => {
    earlierPage(true);
    const view = render(<BackLink href="/" label="Recipes" />);
    view.unmount();
    swipe(document.body, [100, 300], [300, 300]);
    expect(nextState.wentBack).toBe(0);
  });
});
