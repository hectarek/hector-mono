import { afterEach, describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { PageWait } from "@/app/_components/page-wait";
import { ReadyMark } from "@/app/_components/ready-mark";

// D104: the produce row shows while a page can't be tapped, and goes once it can.
describe("PageWait and ReadyMark", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-ready");
  });

  it("draws the reader's produce row, out of the way of taps and screen readers", () => {
    const view = render(<PageWait />);
    const row = view.container.querySelector("[data-page-wait]");
    expect(row?.getAttribute("aria-hidden")).toBe("true");
    expect(row?.className).toContain("pointer-events-none");
    expect(row?.querySelectorAll("svg")).toHaveLength(5);
  });

  it("marks the page ready once React has it", () => {
    expect(document.documentElement.hasAttribute("data-ready")).toBe(false);
    render(<ReadyMark />);
    expect(document.documentElement.hasAttribute("data-ready")).toBe(true);
    expect(performance.getEntriesByName("page-ready")).toHaveLength(1);
  });
});
