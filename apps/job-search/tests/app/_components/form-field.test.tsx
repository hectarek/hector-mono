import { describe, expect, it } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { FormField } from "@/app/_components/form-field";

const TIERS = {
  choices: [
    { value: "", label: "None" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
  ],
};

// A form's field with the form's state behind it, as a record's form holds it.
function Tier({ initial }: { initial: string }) {
  const [tier, setTier] = useState(initial);
  return (
    <FormField
      id="tier"
      label="Tier"
      kind={TIERS}
      value={tier}
      onChange={setTier}
    />
  );
}

const pressed = (button: HTMLElement) => button.getAttribute("aria-pressed");

describe("a choice group", () => {
  it("keeps the picked choice when it's tapped again, and clears it only through None", () => {
    const view = render(<Tier initial="2" />);
    const two = view.getByRole("button", { name: "2" });
    expect(pressed(two)).toBe("true");

    fireEvent.click(two);
    expect(pressed(two)).toBe("true");

    fireEvent.click(view.getByRole("button", { name: "None" }));
    expect(pressed(view.getByRole("button", { name: "None" }))).toBe("true");
    expect(pressed(two)).toBe("false");
  });

  it("names each choice by its label alone, with the picked one's check hidden from screen readers", () => {
    const view = render(<Tier initial="1" />);
    const one = view.getByRole("button", { name: "1" });

    expect(one.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
