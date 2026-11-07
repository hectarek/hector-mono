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

  // R22 as revised 2026-11-07 (the UX plan's Q10): a refresh mustn't close a sheet or lose what's
  // being typed.
  it("waits while a sheet is open or a field has focus, and catches up once they're done", async () => {
    nextState.refreshed = 0;
    render(<AutoRefresh intervalMs={60_000} />);
    const sheet = document.createElement("div");
    sheet.setAttribute("role", "dialog");
    document.body.append(sheet);

    document.dispatchEvent(new Event("visibilitychange"));
    expect(nextState.refreshed).toBe(0);

    sheet.remove();
    const field = document.createElement("input");
    document.body.append(field);
    field.focus();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(nextState.refreshed).toBe(0);

    field.blur();
    // The catch-up checks every 2 seconds.
    await new Promise((done) => setTimeout(done, 2_100));
    expect(nextState.refreshed).toBe(1);
  });
});
