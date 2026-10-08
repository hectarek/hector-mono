import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { Activity } from "react";
import { useClosesWhenHidden } from "@/app/_lib/use-closes-when-hidden";

// D88: Next.js hides a page you leave (React's Activity) rather than unmounting it.
describe("useClosesWhenHidden", () => {
  it("runs the latest close when the page is hidden, and not on a re-render", () => {
    const calls: string[] = [];
    function Sheet({ label }: { label: string }) {
      useClosesWhenHidden(() => {
        calls.push(label);
      });
      return null;
    }
    const page = (mode: "visible" | "hidden", label: string) => (
      <Activity mode={mode}>
        <Sheet label={label} />
      </Activity>
    );

    const view = render(page("visible", "first"));
    view.rerender(page("visible", "second"));
    expect(calls).toEqual([]);

    view.rerender(page("hidden", "second"));
    expect(calls).toEqual(["second"]);
  });
});
