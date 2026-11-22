import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { Stamp } from "@/app/_components/stamp";

// The design system's Stamp: a status, its word saying whose move it is, its color the kind.
describe("Stamp", () => {
  it("writes its word, in stencil, upper case, never wrapping", () => {
    const view = render(<Stamp>Due Fri</Stamp>);
    const stamp = view.getByText("Due Fri");
    expect(stamp.className).toContain("font-heading");
    expect(stamp.className).toContain("uppercase");
    expect(stamp.className).toContain("whitespace-nowrap");
  });

  // Navy is all good; red waits on you now; brown is on hold, in the theme's smudge; solid red
  // is late.
  it("inks each kind in its own color", () => {
    const view = render(
      <>
        <Stamp tone="navy">Available</Stamp>
        <Stamp tone="red">Requested</Stamp>
        <Stamp tone="brown">You asked</Stamp>
        <Stamp tone="late">Overdue</Stamp>
      </>,
    );
    const navy = view.getByText("Available");
    expect(navy.dataset.tone).toBe("navy");
    expect(navy.className).toContain("text-foreground");

    const red = view.getByText("Requested");
    expect(red.className).toContain("text-destructive");
    expect(red.className).toContain("border-destructive");

    const brown = view.getByText("You asked");
    expect(brown.dataset.ink).toBe("smudge");
    expect(brown.className).toContain("border-current");

    const late = view.getByText("Overdue");
    expect(late.className).toContain("bg-destructive");
    expect(late.className).toContain("text-white");
  });

  it("takes the tilt it's given, and otherwise varies with its row", () => {
    const view = render(
      <ul>
        <li>
          <Stamp tilt={4}>Not lent</Stamp>
        </li>
        <li>
          <Stamp>Going</Stamp>
        </li>
      </ul>,
    );
    expect(view.getByText("Not lent").className).toContain("rotate-4");
    expect(view.getByText("Not lent").className).not.toContain("nth-child");
    expect(view.getByText("Going").className).toContain(
      "in-[li:nth-child(4n+2)]:-rotate-3",
    );
  });

  it("is larger on a card or a cover", () => {
    const view = render(<Stamp size="card">Available</Stamp>);
    expect(view.getByText("Available").className).toContain("text-13");
  });
});
