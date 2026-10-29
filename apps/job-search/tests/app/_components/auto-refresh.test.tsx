import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { AutoRefresh } from "@/app/_components/auto-refresh";
import { nextState } from "@/tests/_support/next";

describe("AutoRefresh", () => {
  // KTD15.
  it("refreshes the page when it becomes visible, and stops once gone", () => {
    nextState.refreshed = 0;
    const view = render(<AutoRefresh intervalMs={60_000} />);

    document.dispatchEvent(new Event("visibilitychange"));
    expect(nextState.refreshed).toBe(1);

    view.unmount();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(nextState.refreshed).toBe(1);
  });
});
