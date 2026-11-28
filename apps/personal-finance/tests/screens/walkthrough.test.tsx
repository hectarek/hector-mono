import { describe, expect, it } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { GrowthExample } from "@/app/_components/walkthrough/growth-example";

// The talk's "starting at 35" example: $1,000 a year from 35 to 65, at 8%.
const STARTING_AT_35 = {
  id: "starting-at-35",
  deposit: 1000,
  every: "year",
  depositYears: 30,
  years: 30,
  yearlyReturn: 0.08,
  startAge: 35,
} as const;

function visibleSentence(): string {
  return (
    document.querySelector('[aria-hidden="true"].font-semibold')?.textContent ??
    ""
  );
}

describe("a walkthrough step's growth example", () => {
  it("opens on the talk's numbers", () => {
    render(<GrowthExample {...STARTING_AT_35} />);
    expect(visibleSentence()).toBe(
      "At 65, you'd have about $122,346, from $30,000 you put in.",
    );
  });

  it("follows a changed deposit through the same math as the growth calculator", () => {
    render(<GrowthExample {...STARTING_AT_35} />);
    fireEvent.change(screen.getByLabelText("Each year you put in"), {
      target: { value: "2,000" },
    });
    expect(visibleSentence()).toBe(
      "At 65, you'd have about $244,692, from $60,000 you put in.",
    );
  });

  it("names the fix when the deposit is cleared, with no stale figure", () => {
    render(<GrowthExample {...STARTING_AT_35} />);
    fireEvent.change(screen.getByLabelText("Each year you put in"), {
      target: { value: "" },
    });
    expect(visibleSentence()).toBe("Enter a deposit to see what it grows to");
  });
});
