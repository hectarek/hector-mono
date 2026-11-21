import { describe, expect, it } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";
import { DateSheet } from "@/app/_components/date-sheet";

// X1, as drawn: today is Tue, Nov 10, 2026, and a day before it can't be picked.
const TODAY = "2026-11-10";

function openSheet(onPick: (date: string) => void = () => {}) {
  const view = render(
    <DateSheet
      open
      onOpenChange={() => {}}
      today={TODAY}
      from={TODAY}
      value="2026-11-20"
      onPick={onPick}
    />,
  );
  return view;
}

const month = (view: ReturnType<typeof render>, name: string) =>
  within(view.getByRole("group", { name }));

describe("DateSheet", () => {
  it("switches off the days before the day it's given, and marks today", async () => {
    const view = openSheet();
    await view.findByRole("dialog", { name: "Pick a date" });
    const november = month(view, "November 2026");

    expect(november.getAllByRole("button")).toHaveLength(30);
    for (const day of ["Sun, Nov 1", "Sat, Nov 7", "Mon, Nov 9"]) {
      expect(
        november.getByRole("button", { name: day }).hasAttribute("disabled"),
      ).toBe(true);
    }
    const today = november.getByRole("button", { name: "Today, Tue, Nov 10" });
    expect(today.hasAttribute("disabled")).toBe(false);
    expect(today.getAttribute("aria-current")).toBe("date");
    expect(today.textContent).toBe("10Today");
    expect(
      november
        .getByRole("button", { name: "Wed, Nov 11" })
        .hasAttribute("disabled"),
    ).toBe(false);
    // Nothing before the given day's month is offered at all.
    expect(
      view
        .getByRole("button", { name: "Previous month" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("starts on the day it holds, and gives back the day picked", async () => {
    const picked: string[] = [];
    const view = openSheet((date) => picked.push(date));
    await view.findByRole("dialog", { name: "Pick a date" });
    const november = month(view, "November 2026");

    expect(
      november
        .getByRole("button", { name: "Fri, Nov 20" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(november.getByRole("button", { name: "Thu, Nov 26" }));
    fireEvent.click(view.getByRole("button", { name: "Use Thu, Nov 26" }));
    expect(picked).toEqual(["2026-11-26"]);
  });

  it("turns to the next month, where every day can be picked", async () => {
    const view = openSheet();
    await view.findByRole("dialog", { name: "Pick a date" });
    fireEvent.click(view.getByRole("button", { name: "Next month" }));

    const december = month(view, "December 2026");
    const days = december.getAllByRole("button");
    expect(days).toHaveLength(31);
    expect(days.some((day) => day.hasAttribute("disabled"))).toBe(false);
    // Dec 1, 2026 is a Tuesday: two blank cells come before it.
    expect(days[0]?.getAttribute("aria-label")).toBe("Tue, Dec 1");
    expect(
      view
        .getByRole("button", { name: "Previous month" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
});
