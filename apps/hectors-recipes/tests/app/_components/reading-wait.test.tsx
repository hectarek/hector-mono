import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { ReadingWait } from "@/app/_components/reading-wait";

// D75: the wait while the reader works hops the produce row in a wave, and stands still with
// reduced motion.
describe("ReadingWait", () => {
  const animate = Element.prototype.animate;
  let hops: { delay: number; animation: Animation }[];

  const reducedMotion = (reduce: boolean) =>
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: reduce && query === "(prefers-reduced-motion: reduce)",
      }),
    });

  beforeEach(() => {
    hops = [];
    Element.prototype.animate = function (
      this: Element,
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      const animation = animate.call(this, keyframes, options);
      hops.push({
        delay: typeof options === "object" ? Number(options.delay) : 0,
        animation,
      });
      return animation;
    };
  });

  afterEach(() => {
    Element.prototype.animate = animate;
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("hops the five drawings in turn, and stops when it's gone", () => {
    reducedMotion(false);
    const view = render(<ReadingWait>Reading the recipe.</ReadingWait>);
    view.getByText("Reading the recipe.");

    expect(hops.map((hop) => hop.delay)).toEqual([0, 140, 280, 420, 560]);
    view.unmount();
    expect(hops.map((hop) => hop.animation.playState)).toEqual(
      Array(5).fill("idle"),
    );
  });

  it("stands still with reduced motion", () => {
    reducedMotion(true);
    const view = render(<ReadingWait>Reading the recipe.</ReadingWait>);
    view.getByText("Reading the recipe.");
    expect(hops).toEqual([]);
  });
});
