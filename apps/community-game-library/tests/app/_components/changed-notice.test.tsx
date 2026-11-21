import { describe, expect, it } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { ChangedNotice } from "@/app/_components/changed-notice";
import { CHANGED_LINES } from "@/app/_lib/changed-lines";
import { CHANGED_REASONS } from "@/src/entities/errors/common";

// KTD16: something changed underneath, said in one line, with the next best action.
describe("ChangedNotice", () => {
  it("has a line for every reason a change can give", () => {
    for (const reason of CHANGED_REASONS) {
      expect(CHANGED_LINES[reason].line.length).toBeGreaterThan(0);
    }
  });

  it("says what changed and offers the next best action", () => {
    let next = 0;
    const view = render(
      <ChangedNotice reason="copy-lent" onNext={() => (next += 1)} />,
    );
    expect(view.getByRole("status").textContent).toBe(
      "It was just lent to someone else.",
    );
    fireEvent.click(view.getByRole("button", { name: "Join the line" }));
    expect(next).toBe(1);
  });

  it("offers nothing where there's nothing next", () => {
    const view = render(<ChangedNotice reason="night-cancelled" />);
    expect(view.getByRole("status").textContent).toBe(
      "This game night was cancelled.",
    );
    expect(view.queryAllByRole("button")).toHaveLength(0);
  });
});
