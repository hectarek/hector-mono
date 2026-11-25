import { describe, expect, it } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { Activity, StrictMode } from "react";
import { useClosesOnLeave } from "@/app/_lib/use-closes-on-leave";

function Sheet({ label, calls }: { label: string; calls: string[] }) {
  const key = useClosesOnLeave(() => {
    calls.push(label);
  });
  return (
    <>
      <output>{key}</output>
      <a href="/loans">Loans</a>
      {/* about:blank, so the tab happy-dom opens for it fetches nothing (recipes' copy fetched
          example.com from every run) */}
      <a href="about:blank" target="_blank" rel="noreferrer">
        Source
      </a>
      <button type="button">Not a link</button>
    </>
  );
}

// Recipes' D88: Next.js hides a page you leave (React's Activity) rather than unmounting it, so
// what's open on it closes as you leave.
describe("useClosesOnLeave", () => {
  it("closes on a tap on a link, or on Back or Forward, with a new key each time", () => {
    const calls: string[] = [];
    const view = render(<Sheet label="sheet" calls={calls} />);
    const key = () => view.getByRole("status").textContent;
    expect(key()).toBe("0");

    fireEvent.click(view.getByRole("link", { name: "Loans" }));
    expect(calls).toEqual(["sheet"]);
    expect(key()).toBe("1");

    fireEvent(window, new PopStateEvent("popstate"));
    expect(calls).toEqual(["sheet", "sheet"]);
    expect(key()).toBe("2");
  });

  it("stays open for a link to a new tab, a modified tap, or a button", () => {
    const calls: string[] = [];
    const view = render(<Sheet label="sheet" calls={calls} />);

    fireEvent.click(view.getByRole("link", { name: "Source" }));
    fireEvent.click(view.getByRole("link", { name: "Loans" }), {
      metaKey: true,
    });
    fireEvent.click(view.getByRole("button", { name: "Not a link" }));
    expect(calls).toEqual([]);
  });

  it("runs the latest close when the page is hidden, and not on a re-render", async () => {
    const calls: string[] = [];
    const page = (mode: "visible" | "hidden", label: string) => (
      <Activity mode={mode}>
        <Sheet label={label} calls={calls} />
      </Activity>
    );

    const view = render(page("visible", "first"));
    view.rerender(page("visible", "second"));
    expect(calls).toEqual([]);

    await act(async () => {
      view.rerender(page("hidden", "second"));
    });
    expect(calls).toEqual(["second"]);
  });

  // In development, Strict Mode mounts each component a second time as it first mounts. A sheet
  // that opens with its page (E2's, on arrival from /friends/link) stays open through it.
  it("stays open through Strict Mode's second mount, and still closes when hidden", async () => {
    const calls: string[] = [];
    const page = (mode: "visible" | "hidden") => (
      <StrictMode>
        <Activity mode={mode}>
          <Sheet label="sheet" calls={calls} />
        </Activity>
      </StrictMode>
    );

    const view = render(page("visible"));
    // Strict Mode's second mount ran within the render; let the close's microtask run too.
    await act(() => Promise.resolve());
    expect(calls).toEqual([]);

    await act(async () => {
      view.rerender(page("hidden"));
    });
    expect(calls).toEqual(["sheet"]);
  });
});
